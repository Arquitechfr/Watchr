import { FilterQuery, Types } from "mongoose";
import { Report, IReport, ReportReason, ReportStatus } from "../models/report.model.js";
import { Comment } from "../models/comment.model.js";
import { Show } from "../models/show.model.js";
import { User } from "../models/user.model.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { ApiError } from "../middleware/error.middleware.js";
import { PushNotificationService } from "./pushNotification.service.js";
import { EmailService } from "./email.service.js";
import { getShowTitle } from "../models/show.model.js";
import { wsEvents } from "../lib/wsEvents.js";
import { logError } from "../lib/logger.js";

const DEFAULT_AUTO_HIDE_THRESHOLD = 5;
const DEFAULT_AUTO_SPOILER_THRESHOLD = 3;

async function getThreshold(key: string, fallback: number): Promise<number> {
  const entry = await MobileConfig.findOne({ key }).lean();
  if (!entry) return fallback;
  const parsed = Number(entry.value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

async function notifyAuthorOfAction(
  comment: { userId: { toString(): string }; showId: { toString(): string } },
  action: "deleted" | "hidden" | "auto_spoiler" | "admin_spoiler",
): Promise<void> {
  try {
    const [author, show] = await Promise.all([
      User.findById(comment.userId).select("email username preferredLanguage notificationPreferences expoPushToken").lean(),
      Show.findById(comment.showId).select("title translations").lean(),
    ]);
    if (!author || !show) return;

    const locale = author.preferredLanguage;
    const showTitle = getShowTitle(show, locale ?? "en");

    const pushMethod = {
      deleted: PushNotificationService.notifyCommentDeleted,
      hidden: PushNotificationService.notifyCommentHidden,
      auto_spoiler: PushNotificationService.notifyCommentAutoSpoiler,
      admin_spoiler: PushNotificationService.notifyCommentAdminSpoiler,
    }[action];

    const emailMethod = {
      deleted: EmailService.sendCommentDeletedEmail,
      hidden: EmailService.sendCommentHiddenEmail,
      auto_spoiler: EmailService.sendCommentSpoilerEmail,
      admin_spoiler: EmailService.sendCommentSpoilerEmail,
    }[action];

    pushMethod.call(
      PushNotificationService,
      comment.userId.toString(),
      showTitle,
      comment.showId.toString(),
      locale,
    ).catch((err: unknown) => logError("ReportService", "failed to send push notification", err));

    if (author.notificationPreferences?.emailEnabled !== false) {
      emailMethod.call(
        EmailService,
        author.email,
        author.username,
        locale,
        { showTitle },
      ).catch((err: unknown) => logError("ReportService", "failed to send email notification", err));
    }
  } catch (err: unknown) {
    logError("ReportService", "notifyAuthorOfAction failed", err);
  }
}

export async function createReport(
  reporterId: string,
  commentId: string,
  reason: ReportReason,
): Promise<{ id: string; status: ReportStatus }> {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }

  if (comment.userId.toString() === reporterId) {
    throw new ApiError(400, "CANNOT_REPORT_OWN", "You cannot report your own comment");
  }

  const existing = await Report.findOne({
    reporterId: new Types.ObjectId(reporterId),
    commentId: new Types.ObjectId(commentId),
  });
  if (existing) {
    throw new ApiError(409, "ALREADY_REPORTED", "You have already reported this comment");
  }

  const report = await Report.create({
    reporterId: new Types.ObjectId(reporterId),
    commentId: new Types.ObjectId(commentId),
    reason,
  });

  const incUpdate: Record<string, number> = { reportCount: 1 };
  if (reason === "unmarked_spoiler") {
    incUpdate.spoilerReportCount = 1;
  }
  await Comment.updateOne({ _id: comment._id }, { $inc: incUpdate });

  const [hideThreshold, spoilerThreshold] = await Promise.all([
    getThreshold("comment_auto_hide_threshold", DEFAULT_AUTO_HIDE_THRESHOLD),
    getThreshold("comment_auto_spoiler_threshold", DEFAULT_AUTO_SPOILER_THRESHOLD),
  ]);

  const updatedComment = await Comment.findById(commentId);

  if (updatedComment && !updatedComment.isHidden && updatedComment.reportCount >= hideThreshold) {
    updatedComment.isHidden = true;
    await updatedComment.save();
    wsEvents.emit("comment:hidden", {
      showId: updatedComment.showId.toString(),
      commentId: commentId,
    });
    notifyAuthorOfAction({ userId: updatedComment.userId, showId: updatedComment.showId }, "hidden");
  }

  if (
    updatedComment &&
    !updatedComment.isSpoiler &&
    updatedComment.spoilerReportCount >= spoilerThreshold
  ) {
    updatedComment.isSpoiler = true;
    await updatedComment.save();
    wsEvents.emit("comment:spoiler", {
      showId: updatedComment.showId.toString(),
      commentId: commentId,
      isSpoiler: true,
    });
    notifyAuthorOfAction({ userId: updatedComment.userId, showId: updatedComment.showId }, "auto_spoiler");
  }

  import("./admin/adminFeedNotification.service.js")
    .then(async ({ createNotification }) => {
      const [show, commentAuthor, reporter] = await Promise.all([
        Show.findById(comment.showId).select("title translations").lean(),
        User.findById(comment.userId).select("username").lean(),
        User.findById(reporterId).select("username").lean(),
      ]);
      const showTitle = show ? getShowTitle(show, "en") : "Unknown";
      const authorUsername = commentAuthor?.username ?? "Unknown";
      const reporterUsername = reporter?.username ?? "Unknown";
      const contentPreview = comment.content.length > 80 ? comment.content.slice(0, 80) + "…" : comment.content;
      const episodeStr = comment.episodeRef ? ` S${comment.episodeRef.season}E${comment.episodeRef.episode}` : "";

      createNotification({
        type: "new_report",
        title: "New comment report",
        message: `Report (${reason}): "${contentPreview}" by ${authorUsername} on "${showTitle}"${episodeStr}. Reported by ${reporterUsername}.`,
        severity: "warning",
        metadata: {
          refId: report._id.toString(),
          refType: "report",
          commentId,
          reporterId,
          reporterUsername,
          commentAuthorId: comment.userId.toString(),
          commentAuthorUsername: authorUsername,
          showId: comment.showId.toString(),
          showTitle,
          episodeRef: comment.episodeRef,
          commentContentPreview: contentPreview,
        },
      });
    })
    .catch(() => {});

  return { id: report._id.toString(), status: report.status };
}

export interface ListReportsQuery {
  status?: ReportStatus;
  reason?: ReportReason;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface ListReportsResult {
  reports: Array<{
    id: string;
    reporterId: string;
    reporterUsername: string;
    commentId: string;
    commentContent: string;
    commentAuthorId: string;
    commentAuthorUsername: string;
    showId: string;
    reason: ReportReason;
    status: ReportStatus;
    resolvedBy?: string;
    resolvedAt?: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

export async function listReports(query: ListReportsQuery): Promise<ListReportsResult> {
  const { status, reason, startDate, endDate, page, limit } = query;

  const filter: FilterQuery<IReport> = {};
  if (status) filter.status = status;
  if (reason) filter.reason = reason;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("reporterId", "username")
      .lean(),
    Report.countDocuments(filter),
  ]);

  const commentIds = [...new Set(reports.map((r) => r.commentId.toString()))];
  const comments = await Comment.find({ _id: { $in: commentIds.map((id) => new Types.ObjectId(id)) } })
    .populate("userId", "username")
    .select("content showId userId")
    .lean();

  const commentMap = new Map<string, { content: string; showId: string; authorId: string; authorUsername: string }>();
  for (const c of comments) {
    const populatedUser = c.userId as unknown as { _id?: { toString(): string }; username?: string } | { toString(): string };
    const isPopulated = populatedUser && typeof populatedUser === "object" && "_id" in populatedUser;
    commentMap.set(c._id.toString(), {
      content: c.content,
      showId: c.showId?.toString() ?? "",
      authorId: isPopulated ? (populatedUser as { _id: { toString(): string } })._id.toString() : "",
      authorUsername: isPopulated ? (populatedUser as { username?: string }).username ?? "Unknown" : "Unknown",
    });
  }

  return {
    reports: reports.map((r) => {
      const reporter = r.reporterId as unknown as { _id?: { toString(): string }; username?: string } | { toString(): string };
      const isReporterPopulated = reporter && typeof reporter === "object" && "_id" in reporter;
      const commentInfo = commentMap.get(r.commentId.toString());
      return {
        id: r._id.toString(),
        reporterId: isReporterPopulated ? (reporter as { _id: { toString(): string } })._id.toString() : (reporter as { toString(): string })?.toString() ?? "",
        reporterUsername: isReporterPopulated ? (reporter as { username?: string }).username ?? "Unknown" : "Unknown",
        commentId: r.commentId.toString(),
        commentContent: commentInfo?.content ?? "[deleted]",
        commentAuthorId: commentInfo?.authorId ?? "",
        commentAuthorUsername: commentInfo?.authorUsername ?? "Unknown",
        showId: commentInfo?.showId ?? "",
        reason: r.reason,
        status: r.status,
        resolvedBy: r.resolvedBy?.toString(),
        resolvedAt: r.resolvedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      };
    }),
    total,
    page,
    limit,
  };
}

export async function resolveReport(reportId: string, adminUserId: string): Promise<void> {
  const report = await Report.findByIdAndUpdate(
    reportId,
    { status: "resolved", resolvedBy: new Types.ObjectId(adminUserId), resolvedAt: new Date() },
    { new: true },
  );
  if (!report) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found");
  }
}

export async function dismissReport(reportId: string, adminUserId: string): Promise<void> {
  const report = await Report.findByIdAndUpdate(
    reportId,
    { status: "dismissed", resolvedBy: new Types.ObjectId(adminUserId), resolvedAt: new Date() },
    { new: true },
  );
  if (!report) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found");
  }
}

export async function getReportStats(): Promise<{
  total: number;
  pending: number;
  resolved: number;
  dismissed: number;
  byReason: Array<{ reason: ReportReason; count: number }>;
}> {
  const [total, pending, resolved, dismissed, byReasonAgg] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "resolved" }),
    Report.countDocuments({ status: "dismissed" }),
    Report.aggregate<{ _id: ReportReason; count: number }>([
      { $group: { _id: "$reason", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    total,
    pending,
    resolved,
    dismissed,
    byReason: byReasonAgg.map((r) => ({ reason: r._id, count: r.count })),
  };
}
