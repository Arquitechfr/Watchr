import { FilterQuery, Types } from "mongoose";
import { Comment } from "../../models/comment.model.js";
import { ApiError } from "../../middleware/error.middleware.js";

export interface ListCommentsQuery {
  showId?: string;
  userId?: string;
  isSpoiler?: boolean;
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
  const { showId, userId, isSpoiler, startDate, endDate, page, limit } = query;

  const filter: FilterQuery<typeof Comment> = {};
  if (showId) filter.showId = new Types.ObjectId(showId);
  if (userId) filter.userId = new Types.ObjectId(userId);
  if (isSpoiler !== undefined) filter.isSpoiler = isSpoiler;
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

export async function adminDeleteComment(commentId: string): Promise<void> {
  const result = await Comment.deleteOne({ _id: commentId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }
}

export async function adminBulkDeleteComments(commentIds: string[]): Promise<{ deleted: number }> {
  const result = await Comment.deleteMany({ _id: { $in: commentIds } });
  return { deleted: result.deletedCount };
}

export async function adminMarkSpoiler(commentId: string, isSpoiler: boolean): Promise<{ isSpoiler: boolean }> {
  const comment = await Comment.findByIdAndUpdate(commentId, { isSpoiler }, { new: true }).select("isSpoiler").lean();
  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }
  return { isSpoiler: comment.isSpoiler };
}
