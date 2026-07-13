import { User } from "../../models/user.model.js";
import { NotificationLog } from "../../models/notificationLog.model.js";
import { PushTicket } from "../../models/pushTicket.model.js";
import { AdminJob } from "../../models/adminJob.model.js";
import { PushNotificationService } from "../pushNotification.service.js";
import { processJob } from "./jobQueue.service.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { logError } from "../../lib/logger.js";
import { detectLanguage, translateForUser, pickLongestText, type TranslationInput } from "../translation.service.js";
import type { Types } from "mongoose";

export interface BroadcastInput {
  title: string;
  body: string;
  target: "all" | "locale";
  locale?: string;
  data?: Record<string, unknown>;
}

export interface TargetedInput {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
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
): Promise<{ jobId: string }> {
  const job = await AdminJob.create({
    type: "push_broadcast",
    status: "pending",
    title: input.title,
    body: input.body,
    target: input.target,
    locale: input.locale,
    data: input.data,
    targetCount: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    sentBy: sentBy as unknown as Types.ObjectId,
  });

  processJob(job._id.toString()).catch((err) => {
    logError("AdminNotification", "background job failed", err, { jobId: job._id.toString() });
  });

  return { jobId: job._id.toString() };
}

export async function sendTargeted(
  sentBy: string,
  input: TargetedInput,
): Promise<{ success: boolean }> {
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

  // Auto-translate to user's preferred language
  const sourceText = pickLongestText({ title: input.title, body: input.body });
  const sourceLang = sourceText ? await detectLanguage(sourceText) : "en";
  const translationInput: TranslationInput = { title: input.title, body: input.body };
  const translated = await translateForUser(translationInput, user.preferredLanguage, sourceLang);

  const finalTitle = translated.title ?? input.title;
  const finalBody = translated.body ?? input.body;

  try {
    const tickets = await PushNotificationService.sendPushBatch([
      { to: user.expoPushToken, title: finalTitle, body: finalBody, data: input.data, sound: "default" },
    ]);

    const ticket = tickets[0];
    const success = ticket?.status === "ok";

    const notificationLog = await NotificationLog.create({
      type: "targeted",
      title: finalTitle,
      body: finalBody,
      data: input.data,
      sentBy: sentBy,
      targetCount: 1,
      successCount: success ? 1 : 0,
      failureCount: success ? 0 : 1,
      triggeredBy: "admin",
      locale: user.preferredLanguage,
    });

    await createPushTickets(notificationLog._id, [user.expoPushToken], tickets);
    return { success };
  } catch (err) {
    const notificationLog = await NotificationLog.create({
      type: "targeted",
      title: finalTitle,
      body: finalBody,
      data: input.data,
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
