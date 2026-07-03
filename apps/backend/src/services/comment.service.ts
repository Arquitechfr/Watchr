import { Types } from "mongoose";
import { Comment, IComment } from "../models/comment.model.js";
import { CommentLike } from "../models/commentLike.model.js";
import { Show } from "../models/show.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../middleware/error.middleware.js";

export interface CreateCommentInput {
  showId: string;
  episodeRef?: { season: number; episode: number };
  parentId?: string;
  content: string;
}

export interface UpdateCommentInput {
  content: string;
}

export interface ListCommentsQuery {
  season?: number;
  episode?: number;
  page: number;
  limit: number;
}

export interface CommentItem {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentItem[];
}

export interface ListCommentsResult {
  showId: string;
  episodeRef?: { season: number; episode: number };
  total: number;
  page: number;
  limit: number;
  comments: CommentItem[];
}

async function validateShowExists(showId: string) {
  const show = await Show.findById(showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }
  return show;
}

async function validateUserExists(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
}

async function validateCommentAccess(commentId: string, userId: string) {
  const comment = await Comment.findOne({
    _id: new Types.ObjectId(commentId),
    userId: new Types.ObjectId(userId),
  });
  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }
  return comment;
}

async function validateParentComment(parentId: string, showId: string) {
  const parent = await Comment.findById(parentId);
  if (!parent) {
    throw new ApiError(404, "PARENT_COMMENT_NOT_FOUND", "Parent comment not found");
  }
  if (parent.parentId) {
    throw new ApiError(400, "NESTING_TOO_DEEP", "Cannot reply to a reply");
  }
  if (parent.showId.toString() !== showId) {
    throw new ApiError(400, "SHOW_MISMATCH", "Parent comment belongs to another show");
  }
}

async function getLikedCommentIds(userId: string, commentIds: string[]): Promise<Set<string>> {
  if (commentIds.length === 0) {
    return new Set();
  }
  const likes = await CommentLike.find({
    userId: new Types.ObjectId(userId),
    commentId: { $in: commentIds.map((id) => new Types.ObjectId(id)) },
  });
  return new Set(likes.map((like) => like.commentId.toString()));
}

function buildCommentItem(comment: IComment, likedIds: Set<string>): CommentItem {
  return {
    id: comment._id.toString(),
    userId: comment.userId.toString(),
    content: comment.content,
    likesCount: comment.likesCount,
    likedByMe: likedIds.has(comment._id.toString()),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: [],
  };
}

export async function createComment(userId: string, input: CreateCommentInput) {
  await validateUserExists(userId);
  await validateShowExists(input.showId);

  if (input.parentId) {
    await validateParentComment(input.parentId, input.showId);
  }

  const comment = await Comment.create({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(input.showId),
    episodeRef: input.episodeRef,
    parentId: input.parentId ? new Types.ObjectId(input.parentId) : undefined,
    content: input.content,
  });

  return {
    id: comment._id.toString(),
    userId: comment.userId.toString(),
    showId: comment.showId.toString(),
    episodeRef: comment.episodeRef,
    parentId: comment.parentId?.toString(),
    content: comment.content,
    likesCount: comment.likesCount,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export async function updateComment(userId: string, commentId: string, input: UpdateCommentInput) {
  const comment = await validateCommentAccess(commentId, userId);
  comment.content = input.content;
  await comment.save();

  return {
    id: comment._id.toString(),
    userId: comment.userId.toString(),
    showId: comment.showId.toString(),
    episodeRef: comment.episodeRef,
    parentId: comment.parentId?.toString(),
    content: comment.content,
    likesCount: comment.likesCount,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export async function deleteComment(userId: string, commentId: string) {
  const comment = await validateCommentAccess(commentId, userId);

  const replyIds = await Comment.find({ parentId: comment._id }).select("_id");
  const allIds = [comment._id, ...replyIds.map((reply) => reply._id)];

  await CommentLike.deleteMany({ commentId: { $in: allIds } });
  await Comment.deleteMany({ _id: { $in: allIds } });
}

export async function listCommentsForShow(
  userId: string,
  showId: string,
  query: ListCommentsQuery,
): Promise<ListCommentsResult> {
  await validateShowExists(showId);

  const showObjectId = new Types.ObjectId(showId);
  const matchFilter: {
    showId: Types.ObjectId;
    episodeRef?: { season: number; episode: number };
  } = {
    showId: showObjectId,
  };

  if (query.season !== undefined && query.episode !== undefined) {
    matchFilter.episodeRef = { season: query.season, episode: query.episode };
  }

  const total = await Comment.countDocuments({
    ...matchFilter,
    parentId: { $exists: false },
  });

  const topLevelComments = await Comment.find({
    ...matchFilter,
    parentId: { $exists: false },
  })
    .sort({ createdAt: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  const topLevelIds = topLevelComments.map((comment) => comment._id.toString());
  const replies = await Comment.find({
    ...matchFilter,
    parentId: { $in: topLevelIds.map((id) => new Types.ObjectId(id)) },
  }).sort({ createdAt: 1 });

  const allCommentIds = [
    ...topLevelComments.map((c) => c._id.toString()),
    ...replies.map((c) => c._id.toString()),
  ];
  const likedIds = await getLikedCommentIds(userId, allCommentIds);

  const replyMap = new Map<string, CommentItem[]>();
  for (const reply of replies) {
    const parentId = reply.parentId?.toString();
    if (!parentId || !topLevelIds.includes(parentId)) {
      continue;
    }
    const item = buildCommentItem(reply, likedIds);
    const list = replyMap.get(parentId) || [];
    list.push(item);
    replyMap.set(parentId, list);
  }

  const comments = topLevelComments.map((comment) => {
    const item = buildCommentItem(comment, likedIds);
    item.replies = replyMap.get(comment._id.toString()) || [];
    return item;
  });

  return {
    showId,
    episodeRef:
      query.season !== undefined && query.episode !== undefined
        ? { season: query.season, episode: query.episode }
        : undefined,
    total,
    page: query.page,
    limit: query.limit,
    comments,
  };
}

export async function likeComment(userId: string, commentId: string) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }

  try {
    await CommentLike.create({
      userId: new Types.ObjectId(userId),
      commentId: new Types.ObjectId(commentId),
    });
    comment.likesCount += 1;
    await comment.save();
  } catch (err) {
    // Duplicate key error means already liked; ignore.
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return;
    }
    throw err;
  }
}

export async function unlikeComment(userId: string, commentId: string) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }

  const result = await CommentLike.deleteOne({
    userId: new Types.ObjectId(userId),
    commentId: new Types.ObjectId(commentId),
  });

  if (result.deletedCount > 0) {
    comment.likesCount = Math.max(0, comment.likesCount - 1);
    await comment.save();
  }
}
