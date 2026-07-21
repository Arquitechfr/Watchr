import { User } from "../../models/user.model.js";
import { NotificationLog } from "../../models/notificationLog.model.js";
import { PushTicket } from "../../models/pushTicket.model.js";
import { AdminJob, type IAdminJob } from "../../models/adminJob.model.js";
import { PushNotificationService, type ExpoPushMessage } from "../pushNotification.service.js";
import { processJob } from "./jobQueue.service.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { logError } from "../../lib/logger.js";
import { detectLanguage, translateForUser, pickLongestText, type TranslationInput } from "../translation.service.js";
import { buildPushData } from "../deepLinkCatalog.js";
import type { Types } from "mongoose";

export interface BroadcastInput {
  title: string;
  body: string;
  target: "all" | "locale";
  locale?: string;
  data?: Record<string, unknown>;
  scheduledAt?: string;
  deepLinkScreen?: string;
  deepLinkParams?: Record<string, unknown>;
  customUrl?: string;
  imageUrl?: string;
}

export interface TargetedInput {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  scheduledAt?: string;
  deepLinkScreen?: string;
  deepLinkParams?: Record<string, unknown>;
  customUrl?: string;
  imageUrl?: string;
}

interface TicketInfo {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
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
      logError("AdminNotification", "failed to save push tickets", err),
    );
  }
}

export async function sendBroadcast(
  sentBy: string,
  input: BroadcastInput,
): Promise<{ jobId: string; scheduled: boolean }> {
  const pushData = input.customUrl
    ? buildPushData(undefined, undefined, input.customUrl)
    : input.deepLinkScreen
      ? buildPushData(input.deepLinkScreen, input.deepLinkParams)
      : input.data;

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

  const job = await AdminJob.create({
    type: "push_broadcast",
    status: "pending",
    title: input.title,
    body: input.body,
    target: input.target,
    locale: input.locale,
    data: pushData,
    targetCount: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    sentBy: sentBy as unknown as Types.ObjectId,
    scheduledAt: isScheduled ? scheduledAt : undefined,
    scheduledStatus: isScheduled ? "scheduled" : "none",
    deepLinkScreen: input.deepLinkScreen,
    deepLinkParams: input.deepLinkParams,
    customUrl: input.customUrl,
    imageUrl: input.imageUrl,
  });

  if (!isScheduled) {
    processJob(job._id.toString()).catch((err) => {
      logError("AdminNotification", "background job failed", err, { jobId: job._id.toString() });
    });
  }

  return { jobId: job._id.toString(), scheduled: !!isScheduled };
}

export async function sendTargeted(
  sentBy: string,
  input: TargetedInput,
): Promise<{ success: boolean; scheduled: boolean; jobId?: string }> {
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

  if (isScheduled) {
    const pushData = input.customUrl
      ? buildPushData(undefined, undefined, input.customUrl)
      : input.deepLinkScreen
        ? buildPushData(input.deepLinkScreen, input.deepLinkParams)
        : input.data;

    const job = await AdminJob.create({
      type: "push_targeted_scheduled",
      status: "pending",
      title: input.title,
      body: input.body,
      target: "all",
      data: pushData,
      targetCount: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      sentBy: sentBy as unknown as Types.ObjectId,
      scheduledAt,
      scheduledStatus: "scheduled",
      deepLinkScreen: input.deepLinkScreen,
      deepLinkParams: input.deepLinkParams,
      customUrl: input.customUrl,
      userId: input.userId,
      imageUrl: input.imageUrl,
    });

    return { success: false, scheduled: true, jobId: job._id.toString() };
  }

  const isEmail = input.userId.includes("@");
  const user = isEmail
    ? await User.findOne({ email: input.userId.toLowerCase() }).select("expoPushToken notificationPreferences preferredLanguage").lean()
    : await User.findById(input.userId).select("expoPushToken notificationPreferences preferredLanguage").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  if (!user.expoPushToken) {
    throw new ApiError(400, "NO_PUSH_TOKEN", "User has no push token");
  }

  const pushData = input.customUrl
    ? buildPushData(undefined, undefined, input.customUrl)
    : input.deepLinkScreen
      ? buildPushData(input.deepLinkScreen, input.deepLinkParams)
      : input.data;

  // Auto-translate to user's preferred language
  const sourceText = pickLongestText({ title: input.title, body: input.body });
  const sourceLang = sourceText ? await detectLanguage(sourceText) : "en";
  const translationInput: TranslationInput = { title: input.title, body: input.body };
  const translated = await translateForUser(translationInput, user.preferredLanguage, sourceLang);

  const finalTitle = translated.title ?? input.title;
  const finalBody = translated.body ?? input.body;

  try {
    const message: ExpoPushMessage = { to: user.expoPushToken, title: finalTitle, body: finalBody, data: pushData, sound: "default" };
    if (input.imageUrl) {
      message.richContent = { image: input.imageUrl };
    }
    const tickets = await PushNotificationService.sendPushBatch([message]);

    const ticket = tickets[0];
    const success = ticket?.status === "ok";

    const notificationLog = await NotificationLog.create({
      type: "targeted",
      title: finalTitle,
      body: finalBody,
      data: pushData,
      sentBy: sentBy,
      targetCount: 1,
      successCount: success ? 1 : 0,
      failureCount: success ? 0 : 1,
      triggeredBy: "admin",
      locale: user.preferredLanguage,
    });

    await createPushTickets(notificationLog._id, [user.expoPushToken], tickets);
    return { success, scheduled: false };
  } catch (err) {
    const notificationLog = await NotificationLog.create({
      type: "targeted",
      title: finalTitle,
      body: finalBody,
      data: pushData,
      sentBy: sentBy,
      targetCount: 1,
      successCount: 0,
      failureCount: 1,
      triggeredBy: "admin",
      locale: user.preferredLanguage,
    });

    await createPushTickets(notificationLog._id, [user.expoPushToken], [
      { status: "error", message: err instanceof Error ? err.message : String(err) },
    ]);
    throw err;
  }
}

export interface NotificationHistoryFilters {
  page: number;
  limit: number;
  type?: "broadcast" | "targeted" | "automated";
  search?: string;
}

export async function getNotificationHistory(filters: NotificationHistoryFilters) {
  const { page, limit, type, search } = filters;
  const query: Record<string, unknown> = {};

  if (type) query.type = type;
  if (search) query.title = { $regex: search, $options: "i" };

  const [logs, total] = await Promise.all([
    NotificationLog.find(query)
      .populate("sentBy", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    NotificationLog.countDocuments(query),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l._id.toString(),
      type: l.type,
      title: l.title,
      body: l.body,
      data: l.data ?? null,
      sentBy: l.sentBy
        ? {
            id: (l.sentBy as unknown as { _id: Types.ObjectId })._id.toString(),
            username: (l.sentBy as unknown as { username?: string }).username ?? null,
            email: (l.sentBy as unknown as { email?: string }).email ?? null,
          }
        : null,
      targetCount: l.targetCount,
      successCount: l.successCount,
      failureCount: l.failureCount,
      triggeredBy: l.triggeredBy ?? null,
      locale: l.locale ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getNotificationDetail(id: string) {
  const log = await NotificationLog.findById(id)
    .populate("sentBy", "username email")
    .lean();

  if (!log) return null;

  const tickets = await PushTicket.find({ notificationLogId: log._id })
    .sort({ createdAt: 1 })
    .lean();

  return {
    id: log._id.toString(),
    type: log.type,
    title: log.title,
    body: log.body,
    data: log.data ?? null,
    sentBy: log.sentBy
      ? {
          id: (log.sentBy as unknown as { _id: Types.ObjectId })._id.toString(),
          username: (log.sentBy as unknown as { username?: string }).username ?? null,
          email: (log.sentBy as unknown as { email?: string }).email ?? null,
        }
      : null,
    targetCount: log.targetCount,
    successCount: log.successCount,
    failureCount: log.failureCount,
    triggeredBy: log.triggeredBy ?? null,
    locale: log.locale ?? null,
    createdAt: log.createdAt.toISOString(),
    tickets: tickets.map((t) => ({
      id: t._id.toString(),
      pushToken: t.pushToken.slice(0, 12) + "••••",
      status: t.status,
      errorMessage: t.errorMessage ?? null,
      errorDetails: t.errorDetails ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function listScheduledJobs(filters: { page: number; limit: number; type?: string }): Promise<{ jobs: unknown[]; total: number; page: number; limit: number }> {
  const { page, limit, type } = filters;
  const query: Record<string, unknown> = { scheduledStatus: "scheduled", status: { $ne: "cancelled" } };
  if (type) query.type = type;

  const [jobs, total] = await Promise.all([
    AdminJob.find(query)
      .sort({ scheduledAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AdminJob.countDocuments(query),
  ]);

  return {
    jobs: jobs.map((j) => formatScheduledJob(j)),
    total,
    page,
    limit,
  };
}

export async function updateScheduledJob(jobId: string, updates: {
  title?: string;
  body?: string;
  subject?: string;
  htmlContent?: string;
  scheduledAt?: string;
  deepLinkScreen?: string | null;
  deepLinkParams?: Record<string, unknown> | null;
  customUrl?: string | null;
  imageUrl?: string | null;
}): Promise<IAdminJob | null> {
  const job = await AdminJob.findById(jobId);
  if (!job) return null;
  if (job.scheduledStatus !== "scheduled" || job.status === "cancelled") {
    throw new ApiError(400, "JOB_NOT_SCHEDULABLE", "Job is not in a schedulable state");
  }

  if (updates.title !== undefined) job.title = updates.title;
  if (updates.body !== undefined) job.body = updates.body;
  if (updates.subject !== undefined) job.subject = updates.subject;
  if (updates.htmlContent !== undefined) job.htmlContent = updates.htmlContent;
  if (updates.scheduledAt !== undefined) job.scheduledAt = new Date(updates.scheduledAt);
  if (updates.imageUrl !== undefined) {
    job.imageUrl = updates.imageUrl === null ? undefined : updates.imageUrl;
  }
  if (updates.customUrl !== undefined) {
    job.customUrl = updates.customUrl === null ? undefined : updates.customUrl;
  }
  if (updates.deepLinkScreen !== undefined) {
    if (updates.deepLinkScreen === null) {
      job.deepLinkScreen = undefined;
      job.deepLinkParams = undefined;
    } else {
      job.deepLinkScreen = updates.deepLinkScreen;
      if (updates.deepLinkParams !== undefined && updates.deepLinkParams !== null) {
        job.deepLinkParams = updates.deepLinkParams;
      }
    }
  }
  if (job.customUrl) {
    job.data = buildPushData(undefined, undefined, job.customUrl);
  } else if (job.deepLinkScreen) {
    job.data = buildPushData(job.deepLinkScreen, job.deepLinkParams);
  }

  await job.save();
  return job;
}

export async function cancelScheduledJob(jobId: string): Promise<boolean> {
  const result = await AdminJob.updateOne(
    { _id: jobId, scheduledStatus: "scheduled", status: { $ne: "cancelled" } },
    { $set: { status: "cancelled", scheduledStatus: "cancelled" } },
  );
  return result.modifiedCount > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatScheduledJob(j: any) {
  return {
    id: j._id.toString(),
    type: j.type,
    status: j.status,
    title: j.title ?? null,
    body: j.body ?? null,
    subject: j.subject ?? null,
    htmlContent: j.htmlContent ?? null,
    target: j.target,
    locale: j.locale ?? null,
    data: j.data ?? null,
    targetCount: j.targetCount,
    successCount: j.successCount,
    failureCount: j.failureCount,
    skippedCount: j.skippedCount,
    scheduledAt: j.scheduledAt?.toISOString() ?? null,
    scheduledStatus: j.scheduledStatus ?? "none",
    deepLinkScreen: j.deepLinkScreen ?? null,
    deepLinkParams: j.deepLinkParams ?? null,
    customUrl: j.customUrl ?? null,
    userId: j.userId ?? null,
    imageUrl: j.imageUrl ?? null,
    sentBy: j.sentBy.toString(),
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

export async function getNotificationStats() {
  const [total, broadcast, targeted, automated, totalSuccess, totalFailure] = await Promise.all([
    NotificationLog.countDocuments(),
    NotificationLog.countDocuments({ type: "broadcast" }),
    NotificationLog.countDocuments({ type: "targeted" }),
    NotificationLog.countDocuments({ type: "automated" }),
    NotificationLog.aggregate([{ $group: { _id: null, total: { $sum: "$successCount" } } }]),
    NotificationLog.aggregate([{ $group: { _id: null, total: { $sum: "$failureCount" } } }]),
  ]);

  const successTotal = totalSuccess[0]?.total ?? 0;
  const failureTotal = totalFailure[0]?.total ?? 0;
  const grandTotal = successTotal + failureTotal;

  return {
    total,
    broadcast,
    targeted,
    automated,
    totalSuccess: successTotal,
    totalFailure: failureTotal,
    successRate: grandTotal > 0 ? Math.round((successTotal / grandTotal) * 100) : 0,
  };
}
