import { User } from "../../models/user.model.js";
import { NotificationLog } from "../../models/notificationLog.model.js";
import { PushNotificationService } from "../pushNotification.service.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { log, logError } from "../../lib/logger.js";

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

export async function sendBroadcast(
  sentBy: string,
  input: BroadcastInput,
): Promise<{ targetCount: number; successCount: number; failureCount: number }> {
  const filter: Record<string, unknown> = { expoPushToken: { $exists: true, $ne: null } };
  if (input.target === "locale" && input.locale) {
    filter.preferredLanguage = input.locale;
  }

  const users = await User.find(filter).select("expoPushToken preferredLanguage").lean();
  const tokens = users.map((u) => u.expoPushToken).filter(Boolean) as string[];

  let successCount = 0;
  let failureCount = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    try {
      const messages = batch.map((token) => ({
        to: token,
        title: input.title,
        body: input.body,
        data: input.data,
        sound: "default" as const,
      }));

      const tickets = await PushNotificationService.sendPushBatch(messages);
      for (const ticket of tickets) {
        if (ticket.status === "ok") {
          successCount++;
        } else {
          failureCount++;
        }
      }
    } catch (err) {
      logError("AdminNotification", "broadcast batch failed", err, { batch: i / BATCH_SIZE });
      failureCount += batch.length;
    }
  }

  await NotificationLog.create({
    type: "broadcast",
    title: input.title,
    body: input.body,
    data: input.data,
    sentBy: sentBy,
    targetCount: tokens.length,
    successCount,
    failureCount,
  });

  log("AdminNotification", "broadcast complete", { targetCount: tokens.length, successCount, failureCount });

  return { targetCount: tokens.length, successCount, failureCount };
}

export async function sendTargeted(
  sentBy: string,
  input: TargetedInput,
): Promise<{ success: boolean }> {
  const user = await User.findById(input.userId).select("expoPushToken notificationPreferences preferredLanguage").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  if (!user.expoPushToken) {
    throw new ApiError(400, "NO_PUSH_TOKEN", "User has no push token");
  }

  try {
    await PushNotificationService.sendPush(user.expoPushToken, input.title, input.body, input.data);
    await NotificationLog.create({
      type: "targeted",
      title: input.title,
      body: input.body,
      data: input.data,
      sentBy: sentBy,
      targetCount: 1,
      successCount: 1,
      failureCount: 0,
    });
    return { success: true };
  } catch (err) {
    await NotificationLog.create({
      type: "targeted",
      title: input.title,
      body: input.body,
      data: input.data,
      sentBy: sentBy,
      targetCount: 1,
      successCount: 0,
      failureCount: 1,
    });
    throw err;
  }
}

export async function getNotificationHistory(page: number, limit: number) {
  const [logs, total] = await Promise.all([
    NotificationLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    NotificationLog.countDocuments(),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l._id.toString(),
      type: l.type,
      title: l.title,
      body: l.body,
      sentBy: l.sentBy.toString(),
      targetCount: l.targetCount,
      successCount: l.successCount,
      failureCount: l.failureCount,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}
