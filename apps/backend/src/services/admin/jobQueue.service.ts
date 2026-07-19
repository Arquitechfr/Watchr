import { User } from "../../models/user.model.js";
import { AdminJob, IAdminJob, type JobTranslation } from "../../models/adminJob.model.js";
import { NotificationLog } from "../../models/notificationLog.model.js";
import { PushTicket } from "../../models/pushTicket.model.js";
import { EmailService } from "../email.service.js";
import { PushNotificationService } from "../pushNotification.service.js";
import { translateMultiLang, detectLanguage, pickLongestText, type TranslationInput } from "../translation.service.js";
import { buildDeepLinkUrl, buildPushData } from "../deepLinkCatalog.js";
import { log, logError } from "../../lib/logger.js";
import type { Types } from "mongoose";

interface TicketInfo {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createPushTickets(
  notificationLogId: Types.ObjectId,
  tokens: string[],
  tickets: TicketInfo[],
): Promise<void> {
  const docs = tokens.map((token, i) => ({
    notificationLogId,
    pushToken: token,
    status: (tickets[i]?.status ?? "error") as "ok" | "error",
    errorMessage: tickets[i]?.message,
    errorDetails: tickets[i]?.details?.error,
  }));
  if (docs.length > 0) {
    await PushTicket.insertMany(docs).catch((err) =>
      logError("JobQueue", "failed to save push tickets", err),
    );
  }
}

async function processEmailBroadcast(job: IAdminJob): Promise<void> {
  const filter: Record<string, unknown> = { "notificationPreferences.emailEnabled": true };
  if (job.target === "locale" && job.locale) {
    filter.preferredLanguage = job.locale;
  }

  const users = await User.find(filter).select("email preferredLanguage").lean();
  job.targetCount = users.length;
  await job.save();

  // Auto-translate to user languages
  const sourceText = pickLongestText({ subject: job.subject, htmlContent: job.htmlContent });
  const sourceLang = sourceText ? await detectLanguage(sourceText) : "en";
  job.sourceLanguage = sourceLang;
  job.translationStatus = "pending";
  await job.save();

  const userLangs = [...new Set(
    users
      .map((u) => u.preferredLanguage)
      .filter((lang): lang is string => !!lang && lang !== sourceLang),
  )];

  const translations = new Map<string, TranslationInput>();
  if (userLangs.length > 0) {
    const input: TranslationInput = { subject: job.subject, htmlContent: job.htmlContent };
    const result = await translateMultiLang(input, userLangs, sourceLang);
    for (const [lang, translated] of result) {
      translations.set(lang, translated);
    }
  }

  job.translations = translations as Map<string, { subject?: string; htmlContent?: string; title?: string; body?: string }>;
  job.translationStatus = translations.size > 0 ? "completed" : (userLangs.length > 0 ? "failed" : "skipped");
  await job.save();

  const BATCH_SIZE = 10;
  const BATCH_PAUSE_MS = 1000;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((u) => {
        const lang = u.preferredLanguage;
        const translated = lang ? translations.get(lang) : undefined;
        const subject = translated?.subject ?? job.subject!;
        const htmlContent = translated?.htmlContent ?? job.htmlContent!;
        return EmailService.sendCustomEmail(
          u.email,
          subject,
          htmlContent,
          u.preferredLanguage,
          "admin",
        );
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value) {
          job.successCount++;
        } else {
          job.skippedCount++;
        }
      } else {
        job.failureCount++;
      }
    }
    await job.save();

    if (i + BATCH_SIZE < users.length) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  log("JobQueue", "email broadcast complete", {
    jobId: job._id.toString(),
    targetCount: job.targetCount,
    successCount: job.successCount,
    failureCount: job.failureCount,
    skippedCount: job.skippedCount,
    translationStatus: job.translationStatus,
    translatedLangs: Array.from(translations.keys()),
  });
}

async function processPushBroadcast(job: IAdminJob): Promise<void> {
  const filter: Record<string, unknown> = { expoPushToken: { $exists: true, $ne: null } };
  if (job.target === "locale" && job.locale) {
    filter.preferredLanguage = job.locale;
  }

  const users = await User.find(filter).select("expoPushToken preferredLanguage").lean();

  // Auto-translate to user languages
  const sourceText = pickLongestText({ title: job.title, body: job.body });
  const sourceLang = sourceText ? await detectLanguage(sourceText) : "en";
  job.sourceLanguage = sourceLang;
  job.translationStatus = "pending";
  await job.save();

  const userLangs = [...new Set(
    users
      .map((u) => u.preferredLanguage)
      .filter((lang): lang is string => !!lang && lang !== sourceLang),
  )];

  const translations = new Map<string, TranslationInput>();
  if (userLangs.length > 0) {
    const input: TranslationInput = { title: job.title, body: job.body };
    const result = await translateMultiLang(input, userLangs, sourceLang);
    for (const [lang, translated] of result) {
      translations.set(lang, translated);
    }
  }

  job.translations = translations as Map<string, { subject?: string; htmlContent?: string; title?: string; body?: string }>;
  job.translationStatus = translations.size > 0 ? "completed" : (userLangs.length > 0 ? "failed" : "skipped");
  await job.save();

  // Build user → translated title/body mapping
  const userMessages = users.map((u) => {
    const lang = u.preferredLanguage;
    const translated = lang ? translations.get(lang) : undefined;
    return {
      token: u.expoPushToken!,
      title: translated?.title ?? job.title!,
      body: translated?.body ?? job.body!,
      lang: lang ?? sourceLang,
    };
  }).filter((m) => m.token);

  const tokens = userMessages.map((m) => m.token);
  job.targetCount = tokens.length;
  await job.save();

  const BATCH_SIZE = 100;
  const BATCH_PAUSE_MS = 500;

  let successCount = 0;
  let failureCount = 0;
  const allTickets: TicketInfo[] = [];
  const allTokens: string[] = [];

  for (let i = 0; i < userMessages.length; i += BATCH_SIZE) {
    const batch = userMessages.slice(i, i + BATCH_SIZE);
    allTokens.push(...batch.map((m) => m.token));

    try {
      const messages = batch.map((m) => ({
        to: m.token,
        title: m.title,
        body: m.body,
        data: job.data,
        sound: "default" as const,
      }));

      const tickets = await PushNotificationService.sendPushBatch(messages);
      for (const ticket of tickets) {
        allTickets.push(ticket);
        if (ticket.status === "ok") {
          successCount++;
        } else {
          failureCount++;
        }
      }
    } catch (err) {
      logError("JobQueue", "push broadcast batch failed", err, { batch: i / BATCH_SIZE });
      failureCount += batch.length;
      for (let j = 0; j < batch.length; j++) {
        allTickets.push({ status: "error", message: "Batch send failed" });
      }
    }

    job.successCount = successCount;
    job.failureCount = failureCount;
    await job.save();

    if (i + BATCH_SIZE < userMessages.length) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  const notificationLog = await NotificationLog.create({
    type: "broadcast",
    title: job.title!,
    body: job.body!,
    data: job.data,
    sentBy: job.sentBy,
    targetCount: tokens.length,
    successCount,
    failureCount,
    triggeredBy: "admin",
    locale: job.target === "locale" ? job.locale : undefined,
  });

  await createPushTickets(notificationLog._id, allTokens, allTickets);

  log("JobQueue", "push broadcast complete", {
    jobId: job._id.toString(),
    targetCount: tokens.length,
    successCount,
    failureCount,
    translationStatus: job.translationStatus,
    translatedLangs: Array.from(translations.keys()),
  });
}

async function processPushTargetedScheduled(job: IAdminJob): Promise<void> {
  if (!job.userId) {
    logError("JobQueue", "push_targeted_scheduled: missing userId", null, { jobId: job._id.toString() });
    return;
  }

  const isEmail = job.userId.includes("@");
  const user = isEmail
    ? await User.findOne({ email: job.userId.toLowerCase() }).select("expoPushToken notificationPreferences preferredLanguage").lean()
    : await User.findById(job.userId).select("expoPushToken notificationPreferences preferredLanguage").lean();

  if (!user) {
    logError("JobQueue", "push_targeted_scheduled: user not found", null, { jobId: job._id.toString(), userId: job.userId });
    job.failureCount = 1;
    return;
  }
  if (!user.expoPushToken) {
    log("JobQueue", "push_targeted_scheduled: user has no push token", { userId: job.userId });
    job.skippedCount = 1;
    return;
  }

  const pushData = job.deepLinkScreen
    ? buildPushData(job.deepLinkScreen, job.deepLinkParams)
    : job.data;

  const sourceText = pickLongestText({ title: job.title, body: job.body });
  const sourceLang = sourceText ? await detectLanguage(sourceText) : "en";
  const translationInput: TranslationInput = { title: job.title!, body: job.body! };
  const { translateForUser } = await import("../translation.service.js");
  const translated = await translateForUser(translationInput, user.preferredLanguage, sourceLang);

  const finalTitle = translated.title ?? job.title!;
  const finalBody = translated.body ?? job.body!;

  try {
    const tickets = await PushNotificationService.sendPushBatch([
      { to: user.expoPushToken, title: finalTitle, body: finalBody, data: pushData, sound: "default" },
    ]);

    const ticket = tickets[0];
    const success = ticket?.status === "ok";
    job.targetCount = 1;
    job.successCount = success ? 1 : 0;
    job.failureCount = success ? 0 : 1;

    const notificationLog = await NotificationLog.create({
      type: "targeted",
      title: finalTitle,
      body: finalBody,
      data: pushData,
      sentBy: job.sentBy,
      targetCount: 1,
      successCount: job.successCount,
      failureCount: job.failureCount,
      triggeredBy: "admin",
      locale: user.preferredLanguage,
    });

    await createPushTickets(notificationLog._id, [user.expoPushToken], tickets);
  } catch (err) {
    logError("JobQueue", "push_targeted_scheduled: send failed", err, { jobId: job._id.toString() });
    job.targetCount = 1;
    job.failureCount = 1;
  }
}

async function processEmailTargetedScheduled(job: IAdminJob): Promise<void> {
  if (!job.userId) {
    logError("JobQueue", "email_targeted_scheduled: missing userId", null, { jobId: job._id.toString() });
    return;
  }

  const isEmail = job.userId.includes("@");
  const user = isEmail
    ? await User.findOne({ email: job.userId.toLowerCase() }).select("email preferredLanguage").lean()
    : await User.findById(job.userId).select("email preferredLanguage").lean();

  if (!user) {
    logError("JobQueue", "email_targeted_scheduled: user not found", null, { jobId: job._id.toString(), userId: job.userId });
    job.failureCount = 1;
    return;
  }

  const sourceText = pickLongestText({ subject: job.subject, htmlContent: job.htmlContent });
  const sourceLang = sourceText ? await detectLanguage(sourceText) : "en";
  const translationInput: TranslationInput = { subject: job.subject!, htmlContent: job.htmlContent! };
  const { translateForUser } = await import("../translation.service.js");
  const translated = await translateForUser(translationInput, user.preferredLanguage, sourceLang);

  const ctaUrl = job.deepLinkScreen
    ? buildDeepLinkUrl(job.deepLinkScreen, job.deepLinkParams)
    : undefined;

  try {
    const success = await EmailService.sendCustomEmail(
      user.email,
      translated.subject ?? job.subject!,
      translated.htmlContent ?? job.htmlContent!,
      user.preferredLanguage,
      "admin",
      ctaUrl,
    );

    job.targetCount = 1;
    job.successCount = success ? 1 : 0;
    job.skippedCount = success ? 0 : 1;
  } catch (err) {
    logError("JobQueue", "email_targeted_scheduled: send failed", err, { jobId: job._id.toString() });
    job.targetCount = 1;
    job.failureCount = 1;
  }
}

export async function processJob(jobId: string): Promise<void> {
  try {
    const job = await AdminJob.findById(jobId);
    if (!job) {
      logError("JobQueue", "job not found", null, { jobId });
      return;
    }

    job.status = "processing";
    job.startedAt = new Date();
    await job.save();

    if (job.type === "email_broadcast") {
      await processEmailBroadcast(job);
    } else if (job.type === "push_broadcast") {
      await processPushBroadcast(job);
    } else if (job.type === "push_targeted_scheduled") {
      await processPushTargetedScheduled(job);
    } else if (job.type === "email_targeted_scheduled") {
      await processEmailTargetedScheduled(job);
    }

    job.status = "completed";
    job.completedAt = new Date();
    await job.save();
  } catch (err) {
    logError("JobQueue", "job processing failed", err, { jobId });
    await AdminJob.findByIdAndUpdate(jobId, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: err instanceof Error ? err.message : String(err),
    }).catch((updateErr) => logError("JobQueue", "failed to update failed job", updateErr));
  }
}

export async function getJobStatus(jobId: string) {
  const job = await AdminJob.findById(jobId).lean();
  if (!job) return null;

  return {
    id: job._id.toString(),
    type: job.type,
    status: job.status,
    subject: job.subject ?? null,
    title: job.title ?? null,
    body: job.body ?? null,
    htmlContent: job.htmlContent ?? null,
    target: job.target,
    locale: job.locale ?? null,
    targetCount: job.targetCount,
    successCount: job.successCount,
    failureCount: job.failureCount,
    skippedCount: job.skippedCount,
    sentBy: job.sentBy.toString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    errorMessage: job.errorMessage ?? null,
    scheduledAt: job.scheduledAt?.toISOString() ?? null,
    scheduledStatus: job.scheduledStatus ?? "none",
    deepLinkScreen: job.deepLinkScreen ?? null,
    deepLinkParams: job.deepLinkParams ?? null,
    userId: job.userId ?? null,
    translations: job.translations
      ? Object.fromEntries(
          Object.entries(job.translations as Record<string, JobTranslation>).map(([lang, t]) => [
            lang,
            {
              subject: t.subject ?? null,
              htmlContent: t.htmlContent ?? null,
              title: t.title ?? null,
              body: t.body ?? null,
            },
          ]),
        )
      : null,
    sourceLanguage: job.sourceLanguage ?? null,
    translationStatus: job.translationStatus ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
