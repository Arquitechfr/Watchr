import { Types } from "mongoose";
import { InAppNotification, type IInAppNotification, type InAppNotificationType, type InAppNotificationTarget } from "../models/inAppNotification.model.js";
import { InAppNotificationDismiss } from "../models/inAppNotificationDismiss.model.js";
import { wsEvents } from "../lib/wsEvents.js";
import { log, logError } from "../lib/logger.js";
import { ApiError } from "../middleware/error.middleware.js";

function buildDeepLinkData(deepLinkScreen?: string, deepLinkParams?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!deepLinkScreen) return undefined;
  const data: Record<string, unknown> = { screen: deepLinkScreen };
  if (deepLinkParams) {
    Object.assign(data, deepLinkParams);
  }
  return data;
}

export async function createInAppNotification(input: {
  type: InAppNotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  target: InAppNotificationTarget;
  locale?: string;
  userId?: string;
  createdBy?: string;
  deepLinkScreen?: string;
  deepLinkParams?: Record<string, unknown>;
  expiresAt?: Date;
}): Promise<IInAppNotification> {
  const data = buildDeepLinkData(input.deepLinkScreen, input.deepLinkParams);

  const notification = await InAppNotification.create({
    type: input.type,
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl,
    data,
    target: input.target,
    locale: input.locale,
    userId: input.userId,
    createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
    expiresAt: input.expiresAt,
  });

  if (input.target === "user" && input.userId) {
    wsEvents.emit("notification:new", {
      userId: input.userId,
      notification: {
        type: notification.type,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        data: notification.data,
        serverId: notification._id.toString(),
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } else {
    wsEvents.emit("notification:new", {
      userId: "broadcast",
      notification: {
        type: notification.type,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        data: notification.data,
        serverId: notification._id.toString(),
        createdAt: notification.createdAt.toISOString(),
      },
    });
  }

  log("InAppNotification", "created", { id: notification._id, type: notification.type, target: notification.target });
  return notification;
}

export async function getActiveNotificationsForUser(
  userId: string,
  userLocale?: string,
): Promise<IInAppNotification[]> {
  const now = new Date();

  const dismissed = await InAppNotificationDismiss.find({ userId: new Types.ObjectId(userId) })
    .select("notificationId")
    .lean();
  const dismissedIds = dismissed.map((d: { notificationId: Types.ObjectId }) => d.notificationId);

  const query: Record<string, unknown> = {
    $and: [
      {
        $or: [
          { target: "all" },
          { target: "locale", locale: userLocale },
          { target: "user", userId },
        ],
      },
      {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      },
    ],
  };

  if (dismissedIds.length > 0) {
    query._id = { $nin: dismissedIds };
  }

  return InAppNotification.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean() as unknown as Promise<IInAppNotification[]>;
}

export async function dismissNotification(userId: string, notificationId: string): Promise<void> {
  const notification = await InAppNotification.findById(notificationId).lean();
  if (!notification) {
    throw new ApiError(404, "NOT_FOUND", "Notification not found");
  }

  await InAppNotificationDismiss.updateOne(
    { userId: new Types.ObjectId(userId), notificationId: new Types.ObjectId(notificationId) },
    { $setOnInsert: { dismissedAt: new Date() } },
    { upsert: true },
  );

  log("InAppNotification", "dismissed", { userId, notificationId });
}

export async function listAdminInAppNotifications(filters: {
  page: number;
  limit: number;
  type?: string;
  target?: string;
}): Promise<{ notifications: unknown[]; total: number; page: number; limit: number }> {
  const { page, limit, type, target } = filters;
  const query: Record<string, unknown> = {};
  if (type) query.type = type;
  if (target) query.target = target;

  const [notifications, total] = await Promise.all([
    InAppNotification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InAppNotification.countDocuments(query),
  ]);

  const dismissCounts = await Promise.all(
    notifications.map((n) =>
      InAppNotificationDismiss.countDocuments({ notificationId: n._id }),
    ),
  );

  return {
    notifications: notifications.map((n, i) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      imageUrl: n.imageUrl ?? null,
      data: n.data ?? null,
      target: n.target,
      locale: n.locale ?? null,
      userId: n.userId ?? null,
      createdBy: n.createdBy?.toString() ?? null,
      expiresAt: n.expiresAt?.toISOString() ?? null,
      dismissCount: dismissCounts[i],
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function deleteAdminInAppNotification(id: string): Promise<void> {
  const result = await InAppNotification.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "NOT_FOUND", "Notification not found");
  }
  await InAppNotificationDismiss.deleteMany({ notificationId: id });
  log("InAppNotification", "deleted", { id });
}

export async function createAutomatedInAppNotification(params: {
  type: InAppNotificationType;
  userId: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const notification = await InAppNotification.create({
      type: params.type,
      title: params.title,
      body: params.body,
      imageUrl: params.imageUrl,
      data: params.data,
      target: "user",
      userId: params.userId,
    });

    wsEvents.emit("notification:new", {
      userId: params.userId,
      notification: {
        type: notification.type,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        data: notification.data,
        serverId: notification._id.toString(),
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } catch (err) {
    logError("InAppNotification", "automated create failed", err, { type: params.type, userId: params.userId });
  }
}
