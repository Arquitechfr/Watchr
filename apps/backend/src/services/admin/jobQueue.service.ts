import { User } from "../../models/user.model.js";
import { AdminJob, IAdminJob } from "../../models/adminJob.model.js";
import { NotificationLog } from "../../models/notificationLog.model.js";
import { PushTicket } from "../../models/pushTicket.model.js";
import { EmailService } from "../email.service.js";
import { PushNotificationService } from "../pushNotification.service.js";
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

  const BATCH_SIZE = 10;
  const BATCH_PAUSE_MS = 1000;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((u) =>
        EmailService.sendCustomEmail(
          u.email,
          job.subject!,
          job.htmlContent!,
          u.preferredLanguage,
          "admin",
        ),
      ),
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
  });
}

async function processPushBroadcast(job: IAdminJob): Promise<void> {
  const filter: Record<string, unknown> = { expoPushToken: { $exists: true, $ne: null } };
  if (job.target === "locale" && job.locale) {
    filter.preferredLanguage = job.locale;
  }

  const users = await User.find(filter).select("expoPushToken preferredLanguage").lean();
  const tokens = users.map((u) => u.expoPushToken).filter(Boolean) as string[];

  job.targetCount = tokens.length;
  await job.save();

  const BATCH_SIZE = 100;
  const BATCH_PAUSE_MS = 500;

  let successCount = 0;
  let failureCount = 0;
  const allTickets: TicketInfo[] = [];
  const allTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    allTokens.push(...batch);

    try {
      const messages = batch.map((token) => ({
        to: token,
        title: job.title!,
        body: job.body!,
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

    if (i + BATCH_SIZE < tokens.length) {
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
  });
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
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
