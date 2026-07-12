import {
  AdminNotification,
  type AdminNotificationType,
  type AdminNotificationSeverity,
} from "../../models/adminNotification.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { logError } from "../../lib/logger.js";
import { pushbulletService } from "../pushbullet.service.js";

export interface CreateNotificationInput {
  type: AdminNotificationType;
  title: string;
  message: string;
  severity?: AdminNotificationSeverity;
  metadata?: {
    refId?: string;
    refType?: string;
    userId?: string;
    username?: string;
    [key: string]: unknown;
  };
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const notification = await AdminNotification.create({
      type: input.type,
      title: input.title,
      message: input.message,
      severity: input.severity ?? "info",
      metadata: input.metadata ?? {},
    });

    pushbulletService.push(input.title, input.message).catch(() => {});

    return notification;
  } catch (err) {
    logError("AdminFeedNotification", "failed to create notification", err, { type: input.type, title: input.title });
    return null;
  }
}

export interface ListNotificationsQuery {
  page: number;
  limit: number;
  unreadOnly?: boolean;
  type?: AdminNotificationType;
}

export interface AdminNotificationItem {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  severity: AdminNotificationSeverity;
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ListNotificationsResult {
  notifications: AdminNotificationItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function listNotifications(
  query: ListNotificationsQuery,
): Promise<ListNotificationsResult> {
  const filter: Record<string, unknown> = {};
  if (query.unreadOnly) filter.readAt = null;
  if (query.type) filter.type = query.type;

  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    AdminNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    AdminNotification.countDocuments(filter),
  ]);

  return {
    notifications: docs.map((doc) => ({
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      severity: doc.severity,
      readAt: doc.readAt?.toISOString() ?? null,
      metadata: doc.metadata ?? {},
      createdAt: doc.createdAt.toISOString(),
    })),
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.ceil(total / query.limit),
  };
}

export async function getUnreadCount(): Promise<number> {
  return AdminNotification.countDocuments({ readAt: null });
}

export async function markAsRead(id: string): Promise<void> {
  const result = await AdminNotification.findByIdAndUpdate(
    id,
    { readAt: new Date() },
    { new: true },
  );
  if (!result) {
    throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
  }
}

export async function markAllAsRead(): Promise<{ modifiedCount: number }> {
  const result = await AdminNotification.updateMany(
    { readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { modifiedCount: result.modifiedCount };
}

export async function deleteNotification(id: string): Promise<void> {
  const result = await AdminNotification.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
  }
}

export async function deleteOldNotifications(days: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const result = await AdminNotification.deleteMany({
    createdAt: { $lt: cutoff },
    readAt: { $ne: null },
  });
  return result.deletedCount;
}
