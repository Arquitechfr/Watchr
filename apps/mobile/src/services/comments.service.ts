import { log } from "../utils/logger";
import { api } from "./api";

export interface EpisodeRef {
  season: number;
  episode: number;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
}

export interface CreateCommentInput {
  showId: string;
  episodeRef?: EpisodeRef;
  parentId?: string;
  content: string;
}

export interface UpdateCommentInput {
  id: string;
  content: string;
}

export interface ListCommentsResult {
  showId: string;
  episodeRef?: EpisodeRef;
  total: number;
  page: number;
  limit: number;
  comments: Comment[];
}

export interface ListCommentsQuery {
  season?: number;
  episode?: number;
  page?: number;
  limit?: number;
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
  const response = await api.patch<Comment>(`/comments/${input.id}`, { content: input.content });
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
