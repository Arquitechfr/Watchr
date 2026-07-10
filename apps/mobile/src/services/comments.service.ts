import { log } from "../utils/logger";
import { api } from "./api";

export interface EpisodeRef {
  season: number;
  episode: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  parentId?: string;
  content: string;
  images: string[];
  isSpoiler: boolean;
  likesCount: number;
  replyCount: number;
  likedByMe: boolean;
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
  aiSpoilerDetected?: boolean;
}

export interface CreateCommentInput {
  showId: string;
  episodeRef?: EpisodeRef;
  parentId?: string;
  content: string;
  images?: string[];
  isSpoiler?: boolean;
}

export interface UpdateCommentInput {
  id: string;
  content: string;
  images?: string[];
  isSpoiler?: boolean;
}

export interface ListCommentsResult {
  showId: string;
  episodeRef?: EpisodeRef;
  total: number;
  page: number;
  limit: number;
  comments: Comment[];
}

export type CommentSort = "relevant" | "liked" | "replied" | "recent";

export interface ListCommentsQuery {
  season?: number;
  episode?: number;
  page?: number;
  limit?: number;
  sort?: CommentSort;
}

export interface ListRepliesResult {
  commentId: string;
  total: number;
  page: number;
  limit: number;
  replies: Comment[];
}

export async function getCommentCount(
  showId: string,
  query?: { season?: number; episode?: number },
): Promise<{ total: number }> {
  log("CommentsService", "count", { showId, query });
  const response = await api.get<{ total: number }>(`/comments/show/${showId}/count`, {
    params: query,
  });
  log("CommentsService", "count response", { total: response.data.total });
  return response.data;
}

export async function listCommentsForShow(showId: string, query?: ListCommentsQuery): Promise<ListCommentsResult> {
  log("CommentsService", "list", { showId, query });
  const response = await api.get<ListCommentsResult>(`/comments/show/${showId}`, {
    params: query,
  });
  log("CommentsService", "list response", { total: response.data.total });
  return response.data;
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  log("CommentsService", "create", { showId: input.showId, episodeRef: input.episodeRef, parentId: input.parentId });
  const response = await api.post<Comment>("/comments", input);
  log("CommentsService", "create response", { id: response.data.id });
  return response.data;
}

export async function updateComment(input: UpdateCommentInput): Promise<Comment> {
  log("CommentsService", "update", { id: input.id, content: input.content });
  const response = await api.patch<Comment>(`/comments/${input.id}`, {
    content: input.content,
    images: input.images,
    isSpoiler: input.isSpoiler,
  });
  log("CommentsService", "update response", { id: response.data.id });
  return response.data;
}

export async function deleteComment(id: string): Promise<void> {
  log("CommentsService", "delete", { id });
  await api.delete(`/comments/${id}`);
  log("CommentsService", "delete success");
}

export async function likeComment(id: string): Promise<void> {
  log("CommentsService", "like", { id });
  await api.post(`/comments/${id}/like`);
  log("CommentsService", "like success");
}

export async function unlikeComment(id: string): Promise<void> {
  log("CommentsService", "unlike", { id });
  await api.delete(`/comments/${id}/like`);
  log("CommentsService", "unlike success");
}

export async function addReaction(id: string, emoji: string): Promise<void> {
  log("CommentsService", "addReaction", { id, emoji });
  await api.post(`/comments/${id}/reactions`, { emoji });
  log("CommentsService", "addReaction success");
}

export async function removeReaction(id: string, emoji: string): Promise<void> {
  log("CommentsService", "removeReaction", { id, emoji });
  await api.post(`/comments/${id}/reactions/remove`, { emoji });
  log("CommentsService", "removeReaction success");
}

export async function getCommentById(commentId: string): Promise<Comment> {
  log("CommentsService", "getById", { commentId });
  const response = await api.get<Comment>(`/comments/${commentId}`);
  log("CommentsService", "getById response", { id: response.data.id });
  return response.data;
}

export async function listRepliesForComment(
  commentId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListRepliesResult> {
  log("CommentsService", "listReplies", { commentId, page, limit });
  const response = await api.get<ListRepliesResult>(`/comments/${commentId}/replies`, {
    params: { page, limit },
  });
  log("CommentsService", "listReplies response", { total: response.data.total });
  return response.data;
}

export type ReportReason = "spam" | "unmarked_spoiler" | "harassment" | "inappropriate" | "off_topic";

export async function reportComment(commentId: string, reason: ReportReason): Promise<void> {
  log("CommentsService", "report", { commentId, reason });
  await api.post(`/comments/${commentId}/report`, { reason });
  log("CommentsService", "report success");
}

export interface ThreadSummary {
  summary: string | null;
  commentCount: number;
  source: "ai" | "fallback";
}

export async function getThreadSummary(
  showId: string,
  episodeRef?: { season: number; episode: number },
): Promise<ThreadSummary> {
  log("CommentsService", "threadSummary", { showId, episodeRef });
  const response = await api.get<ThreadSummary>(`/comments/show/${showId}/summary`, {
    params: episodeRef ? { season: episodeRef.season, episode: episodeRef.episode } : undefined,
  });
  return response.data;
}
