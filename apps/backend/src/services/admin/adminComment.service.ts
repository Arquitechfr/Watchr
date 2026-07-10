import { FilterQuery, Types } from "mongoose";
import { Comment } from "../../models/comment.model.js";
import { CommentLike } from "../../models/commentLike.model.js";
import { CommentReaction } from "../../models/commentReaction.model.js";
import { Report } from "../../models/report.model.js";
import { Show } from "../../models/show.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { PushNotificationService } from "../pushNotification.service.js";
import { EmailService } from "../email.service.js";
import { getShowTitle } from "../../models/show.model.js";
import { logError } from "../../lib/logger.js";

export interface ListCommentsQuery {
  showId?: string;
  userId?: string;
  isSpoiler?: boolean;
  isHidden?: boolean;
  minReports?: number;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface ListCommentsResult {
  comments: Array<{
    id: string;
    userId: string;
    authorUsername: string;
    showId: string;
    content: string;
    isSpoiler: boolean;
    isHidden: boolean;
    reportCount: number;
    spoilerReportCount: number;
    likesCount: number;
    replyCount: number;
    createdAt: string;
    updatedAt: string;
 }>;
  total: number;
  page: number;
  limit: number;
}

export async function listAllComments(query: ListCommentsQuery): Promise<ListCommentsResult> {
  const { showId, userId, isSpoiler, isHidden, minReports, startDate, endDate, page, limit } = query;

  const filter: FilterQuery<typeof Comment> = {};
  if (showId) filter.showId = new Types.ObjectId(showId);
  if (userId) filter.userId = new Types.ObjectId(userId);
  if (isSpoiler !== undefined) filter.isSpoiler = isSpoiler;
  if (isHidden !== undefined) filter.isHidden = isHidden;
  if (minReports !== undefined) filter.reportCount = { $gte: minReports };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate("userId", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return {
    comments: comments.map((c) => {
      const populatedUser = c.userId as unknown as { _id?: { toString(): string }; username?: string } | { toString(): string };
      const isPopulated = populatedUser && typeof populatedUser === "object" && "_id" in populatedUser;
      return {
      id: c._id.toString(),
      userId: isPopulated ? (populatedUser as { _id: { toString(): string } })._id.toString() : (populatedUser as { toString(): string })?.toString() ?? "",
      authorUsername: isPopulated ? (populatedUser as { username?: string }).username ?? "Unknown" : "Unknown",
      showId: c.showId?.toString() ?? "",
      content: c.content,
      isSpoiler: c.isSpoiler,
      isHidden: c.isHidden ?? false,
      reportCount: c.reportCount ?? 0,
      spoilerReportCount: c.spoilerReportCount ?? 0,
      likesCount: c.likesCount,
      replyCount: c.replyCount,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      };
    }),
    total,
    page,
    limit,
  };
}

async function notifyAuthorDeleted(comment: { userId: { toString(): string }; showId: { toString(): string } }): Promise<void> {
  try {
    const [author, show] = await Promise.all([
      User.findById(comment.userId).select("email username preferredLanguage notificationPreferences").lean(),
      Show.findById(comment.showId).select("title translations").lean(),
    ]);
    if (!author || !show) return;

    const locale = author.preferredLanguage;
    const showTitle = getShowTitle(show, locale ?? "en");

    PushNotificationService.notifyCommentDeleted(
      comment.userId.toString(),
      showTitle,
      comment.showId.toString(),
      locale,
    ).catch((err) => logError("AdminCommentService", "failed to send delete push", err));

    if (author.notificationPreferences?.emailEnabled !== false) {
      EmailService.sendCommentDeletedEmail(
        author.email,
        author.username,
        locale,
        { showTitle },
      ).catch((err) => logError("AdminCommentService", "failed to send delete email", err));
    }
  } catch (err) {
    logError("AdminCommentService", "notifyAuthorDeleted failed", err);
  }
}

async function notifyAuthorSpoiler(comment: { userId: { toString(): string }; showId: { toString(): string } }): Promise<void> {
  try {
    const [author, show] = await Promise.all([
      User.findById(comment.userId).select("email username preferredLanguage notificationPreferences").lean(),
      Show.findById(comment.showId).select("title translations").lean(),
    ]);
    if (!author || !show) return;

    const locale = author.preferredLanguage;
    const showTitle = getShowTitle(show, locale ?? "en");

    PushNotificationService.notifyCommentAdminSpoiler(
      comment.userId.toString(),
      showTitle,
      comment.showId.toString(),
      locale,
    ).catch((err) => logError("AdminCommentService", "failed to send spoiler push", err));

    if (author.notificationPreferences?.emailEnabled !== false) {
      EmailService.sendCommentSpoilerEmail(
        author.email,
        author.username,
        locale,
        { showTitle },
      ).catch((err) => logError("AdminCommentService", "failed to send spoiler email", err));
    }
  } catch (err) {
    logError("AdminCommentService", "notifyAuthorSpoiler failed", err);
  }
}

export async function adminDeleteComment(commentId: string): Promise<void> {
  const comment = await Comment.findById(commentId).select("userId showId").lean();
  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }
  await Comment.deleteOne({ _id: commentId });
  notifyAuthorDeleted(comment);
}

export async function adminBulkDeleteComments(commentIds: string[]): Promise<{ deleted: number }> {
  const comments = await Comment.find({ _id: { $in: commentIds } }).select("userId showId").lean();
  const result = await Comment.deleteMany({ _id: { $in: commentIds } });
  for (const comment of comments) {
    notifyAuthorDeleted(comment);
  }
  return { deleted: result.deletedCount };
}

export async function deleteAllUserComments(userId: string): Promise<{ deleted: number }> {
  const comments = await Comment.find({ userId }).select("_id userId showId").lean();
  if (comments.length === 0) {
    return { deleted: 0 };
  }

  const commentIds = comments.map((c) => c._id);

  await Promise.all([
    Comment.deleteMany({ _id: { $in: commentIds } }),
    CommentLike.deleteMany({ commentId: { $in: commentIds } }),
    CommentReaction.deleteMany({ commentId: { $in: commentIds } }),
    Report.deleteMany({ commentId: { $in: commentIds } }),
    CommentLike.deleteMany({ userId }),
    CommentReaction.deleteMany({ userId }),
  ]);

  for (const comment of comments) {
    notifyAuthorDeleted(comment);
  }

  return { deleted: comments.length };
}

export async function deleteAllComments(): Promise<{ deleted: number }> {
  const result = await Comment.deleteMany({});
  await Promise.all([
    CommentLike.deleteMany({}),
    CommentReaction.deleteMany({}),
    Report.deleteMany({}),
  ]);
  return { deleted: result.deletedCount };
}

export async function adminMarkSpoiler(commentId: string, isSpoiler: boolean): Promise<{ isSpoiler: boolean }> {
  const comment = await Comment.findByIdAndUpdate(commentId, { isSpoiler }, { new: true }).select("isSpoiler userId showId").lean();
  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }
  if (isSpoiler) {
    notifyAuthorSpoiler(comment);
  }
  return { isSpoiler: comment.isSpoiler };
}
