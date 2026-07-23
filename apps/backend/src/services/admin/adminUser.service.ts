import { FilterQuery, Types } from "mongoose";
import { User } from "../../models/user.model.js";
import { BanAction } from "../../models/banAction.model.js";
import { Comment } from "../../models/comment.model.js";
import { WatchEntry } from "../../models/watchEntry.model.js";
import { Rating } from "../../models/rating.model.js";
import { ImportJob } from "../../models/importJob.model.js";
import { Favorite } from "../../models/favorite.model.js";
import { CommentLike } from "../../models/commentLike.model.js";
import { CommentReaction } from "../../models/commentReaction.model.js";
import { PendingImportReview } from "../../models/pendingImportReview.model.js";
import { TraktLink } from "../../models/traktLink.model.js";
import { Report } from "../../models/report.model.js";
import { Message } from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { Follow } from "../../models/follow.model.js";
import { UserBlock } from "../../models/userBlock.model.js";
import { MessageReport } from "../../models/messageReport.model.js";
import { InAppNotificationDismiss } from "../../models/inAppNotificationDismiss.model.js";
import { ContactMessage } from "../../models/contactMessage.model.js";
import { ApiKey } from "../../models/ApiKey.js";
import { McpOAuthToken } from "../../models/McpOAuthToken.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { invalidateUserBanCache } from "../../middleware/requireAuth.middleware.js";
import { getUserStats } from "../stats.service.js";
import { EmailService } from "../email.service.js";
import { PushNotificationService } from "../pushNotification.service.js";
import { translateNotification, normalizeLocale } from "../../i18n/index.js";
import { SupportedLocale } from "../../i18n/translations.js";
import { scheduleBanActionJob, cancelBanActionJob } from "../../workers/banScheduler.worker.js";
import { log, logError } from "../../lib/logger.js";

const INTL_LOCALE_MAP: Record<SupportedLocale, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-PT",
  de: "de-DE",
  it: "it-IT",
  ar: "ar",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
  ru: "ru-RU",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
};

export interface ListUsersQuery {
  search?: string;
  role?: "user" | "admin";
  sortBy?: "createdAt" | "username" | "email" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
  page: number;
  limit: number;
  lastUsersVisitAt?: Date | null;
}

export interface ListUsersResult {
  users: Array<{
    id: string;
    email: string;
    username: string;
    avatarUrl?: string;
    role: string;
    lastLoginAt: string | null;
    createdAt: string;
    hasCompletedOnboarding: boolean;
    isNew: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}

export async function listUsers(query: ListUsersQuery): Promise<ListUsersResult> {
  const { search, role, sortBy = "createdAt", sortOrder = "desc", page, limit, lastUsersVisitAt } = query;

  const filter: FilterQuery<typeof User> = {};
  if (role) {
    filter.role = role;
  }
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { email: { $regex: escapedSearch, $options: "i" } },
      { username: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortOptions: Record<string, 1 | -1> = { [sortBy]: sortDirection };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("email username avatarUrl role lastLoginAt createdAt hasCompletedOnboarding isBanned bannedAt suspendedUntil banReason preferredLanguage signupPlatform")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      username: u.username,
      avatarUrl: u.avatarUrl,
      role: u.role,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      hasCompletedOnboarding: u.hasCompletedOnboarding,
      isBanned: u.isBanned,
      bannedAt: u.bannedAt?.toISOString() ?? null,
      suspendedUntil: u.suspendedUntil?.toISOString() ?? null,
      banReason: u.banReason,
      preferredLanguage: u.preferredLanguage,
      signupPlatform: u.signupPlatform ?? null,
      isNew: lastUsersVisitAt ? u.createdAt > lastUsersVisitAt : false,
    })),
    total,
    page,
    limit,
  };
}

export interface AdminUserDetail {
  id: string;
  email: string;
  username: string;
  usernameChanged: boolean;
  avatarUrl?: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  preferredLanguage?: string;
  themePreference: string;
  hasCompletedOnboarding: boolean;
  googleLinked: boolean;
  expoPushToken?: string;
  notificationPreferences: Record<string, unknown>;
  isBanned: boolean;
  bannedAt: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
  signupPlatform: string | null;
  stats: Awaited<ReturnType<typeof getUserStats>>;
  recentComments: Array<{
    id: string;
    content: string;
    showId: string;
    createdAt: string;
  }>;
  trackingCount: number;
  favoritesCount: number;
  ratingsCount: number;
  importJobsCount: number;
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  const [stats, recentComments, trackingCount, favoritesCount, ratingsCount, importJobsCount] = await Promise.all([
    getUserStats(userId, "en"),
    Comment.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).select("content showId createdAt").lean(),
    WatchEntry.countDocuments({ userId: user._id }),
    Favorite.countDocuments({ userId: user._id }),
    Rating.countDocuments({ userId: user._id }),
    ImportJob.countDocuments({ userId: user._id }),
  ]);

  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    usernameChanged: user.usernameChanged,
    avatarUrl: user.avatarUrl,
    role: user.role,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    preferredLanguage: user.preferredLanguage,
    themePreference: user.themePreference ?? "system",
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    googleLinked: !!user.firebaseUid,
    expoPushToken: user.expoPushToken,
    notificationPreferences: user.notificationPreferences as unknown as Record<string, unknown>,
    isBanned: user.isBanned,
    bannedAt: user.bannedAt?.toISOString() ?? null,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    banReason: user.banReason,
    signupPlatform: user.signupPlatform ?? null,
    stats,
    recentComments: recentComments.map((c) => ({
      id: c._id.toString(),
      content: c.content,
      showId: c.showId?.toString() ?? "",
      createdAt: c.createdAt.toISOString(),
    })),
    trackingCount,
    favoritesCount,
    ratingsCount,
    importJobsCount,
  };
}

export async function scheduleUserStatusAction(
  userId: string,
  adminId: string,
  input: {
    action: "ban" | "unban" | "suspend" | "unsuspend";
    reason: string;
    delayHours: number;
    durationDays?: number;
  },
): Promise<{ scheduled: boolean; executionDate: Date; actionId: string }> {
  const user = await User.findById(userId).select("email username preferredLanguage expoPushToken notificationPreferences");
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  const locale = normalizeLocale(user.preferredLanguage);
  const now = new Date();
  const executionDate = new Date(now.getTime() + input.delayHours * 3600 * 1000);
  const isImmediate = input.delayHours === 0;

  const banAction = await BanAction.create({
    userId: user._id,
    action: input.action,
    reason: input.reason,
    performedBy: adminId,
    delayHours: input.delayHours,
    scheduledAt: now,
    executedAt: isImmediate ? now : null,
    status: isImmediate ? "executed" : "pending",
  });

  const actionLabel = translateNotification(
    input.action === "ban" ? "actionBan" : "actionSuspend",
    locale,
  );
  const intlLocale = INTL_LOCALE_MAP[locale];
  const effectiveDateStr = executionDate.toLocaleDateString(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let suspendedUntilStr: string | undefined;
  if (input.action === "suspend" && input.durationDays) {
    const until = new Date(now.getTime() + input.durationDays * 24 * 3600 * 1000);
    suspendedUntilStr = until.toLocaleDateString(intlLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (input.action === "ban" || input.action === "suspend") {
    EmailService.sendBanNotificationEmail(
      user.email,
      user.username,
      locale,
      {
        action: actionLabel,
        reason: input.reason,
        effectiveDate: effectiveDateStr,
        suspendedUntil: suspendedUntilStr,
      },
    ).catch((err) => logError("BanService", "failed to send ban email", err, { userId }));

    if (user.expoPushToken) {
      const title = translateNotification("banTitle", locale);
      const body = translateNotification("banBody", locale, { action: actionLabel, reason: input.reason });
      PushNotificationService.sendPush(user.expoPushToken, title, body, { type: "ban_notice" }).catch((err) =>
        logError("BanService", "failed to send ban push", err, { userId }),
      );
    }
  }

  if (isImmediate) {
    await applyBanAction(user._id.toString(), input.action, input.reason, input.durationDays);
  } else {
    await scheduleBanActionJob(banAction._id.toString(), input.delayHours * 3600 * 1000);
  }

  log("BanService", "ban action scheduled", { userId, action: input.action, delayHours: input.delayHours });

  return { scheduled: !isImmediate, executionDate, actionId: banAction._id.toString() };
}

export async function executeBanAction(actionId: string): Promise<void> {
  const banAction = await BanAction.findById(actionId);
  if (!banAction) {
    logError("BanService", "ban action not found", null, { actionId });
    return;
  }
  if (banAction.status !== "pending") {
    log("BanService", "ban action already processed, skipping", { actionId, status: banAction.status });
    return;
  }

  await applyBanAction(
    banAction.userId.toString(),
    banAction.action,
    banAction.reason,
    undefined,
  );

  banAction.executedAt = new Date();
  banAction.status = "executed";
  await banAction.save();

  log("BanService", "ban action executed", { actionId, action: banAction.action });
}

async function applyBanAction(
  userId: string,
  action: "ban" | "unban" | "suspend" | "unsuspend",
  reason: string,
  durationDays?: number,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  switch (action) {
    case "ban":
      user.isBanned = true;
      user.bannedAt = new Date();
      user.suspendedUntil = null;
      user.banReason = reason;
      user.expoPushToken = undefined;
      user.refreshTokens = [];
      break;
    case "unban":
      user.isBanned = false;
      user.bannedAt = null;
      user.suspendedUntil = null;
      user.banReason = null;
      break;
    case "suspend":
      user.suspendedUntil = new Date(Date.now() + (durationDays ?? 7) * 24 * 3600 * 1000);
      user.isBanned = false;
      user.banReason = reason;
      user.expoPushToken = undefined;
      user.refreshTokens = [];
      break;
    case "unsuspend":
      user.suspendedUntil = null;
      user.banReason = null;
      break;
  }

  await user.save();
  invalidateUserBanCache(userId);
}

export async function cancelBanAction(userId: string, actionId: string): Promise<void> {
  const banAction = await BanAction.findOne({ _id: actionId, userId });
  if (!banAction) {
    throw new ApiError(404, "BAN_ACTION_NOT_FOUND", "Ban action not found");
  }
  if (banAction.status !== "pending") {
    throw new ApiError(400, "BAN_ACTION_NOT_PENDING", "Ban action is not pending");
  }

  banAction.status = "cancelled";
  await banAction.save();

  await cancelBanActionJob(actionId);
  log("BanService", "ban action cancelled", { actionId, userId });
}

export async function getBanHistory(userId: string): Promise<
  Array<{
    id: string;
    action: string;
    reason: string;
    delayHours: number;
    scheduledAt: string;
    executedAt: string | null;
    status: string;
  }>
> {
  const actions = await BanAction.find({ userId }).sort({ scheduledAt: -1 }).lean();
  return actions.map((a) => ({
    id: a._id.toString(),
    action: a.action,
    reason: a.reason,
    delayHours: a.delayHours,
    scheduledAt: a.scheduledAt.toISOString(),
    executedAt: a.executedAt?.toISOString() ?? null,
    status: a.status,
  }));
}

export async function updateUserRole(userId: string, role: "user" | "admin"): Promise<{ role: string }> {
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select("role").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return { role: user.role };
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  if (user.role === "admin") {
    throw new ApiError(403, "CANNOT_DELETE_ADMIN", "Cannot delete an admin user");
  }

  const userObjectId = new Types.ObjectId(userId);

  const conversations = await Conversation.find({
    participantIds: userObjectId,
  })
    .select("_id")
    .lean();
  const conversationIds = conversations.map((c) => c._id);

  if (conversationIds.length > 0) {
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
  }

  await Promise.all([
    Comment.deleteMany({ userId }),
    CommentLike.deleteMany({ userId }),
    CommentReaction.deleteMany({ userId }),
    WatchEntry.deleteMany({ userId }),
    Favorite.deleteMany({ userId }),
    Rating.deleteMany({ userId }),
    ImportJob.deleteMany({ userId }),
    PendingImportReview.deleteMany({ userId }),
    TraktLink.deleteMany({ userId }),
    BanAction.deleteMany({ userId }),
    Report.deleteMany({ reporterId: userId }),
    Message.deleteMany({ senderId: userObjectId }),
    Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] }),
    UserBlock.deleteMany({ $or: [{ blockerId: userId }, { blockedId: userId }] }),
    MessageReport.deleteMany({ reporterId: userId }),
    InAppNotificationDismiss.deleteMany({ userId: userObjectId }),
    ContactMessage.deleteMany({ userId }),
    ApiKey.deleteMany({ userId }),
    McpOAuthToken.deleteMany({ userId }),
    User.deleteOne({ _id: userId }),
  ]);
}

export async function markUsersAsSeen(adminId: string): Promise<void> {
  await User.findByIdAndUpdate(adminId, { lastUsersVisitAt: new Date() });
  log("AdminUserService", "marked users as seen", { adminId });
}

export async function countNewUsersSinceLastVisit(adminId: string): Promise<number> {
  const admin = await User.findById(adminId).select("lastUsersVisitAt").lean();
  if (!admin || !admin.lastUsersVisitAt) {
    return User.countDocuments();
  }
  return User.countDocuments({ createdAt: { $gt: admin.lastUsersVisitAt } });
}
