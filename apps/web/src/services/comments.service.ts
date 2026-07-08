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
  content: string;
  images: string[];
  isSpoiler: boolean;
  likesCount: number;
  replyCount: number;
  likedByMe: boolean;
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
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
  const response = await api.get<{ total: number }>(`/comments/show/${showId}/count`, {
    params: query,
  });
  return response.data;
}

export async function listCommentsForShow(showId: string, query?: ListCommentsQuery): Promise<ListCommentsResult> {
  const response = await api.get<ListCommentsResult>(`/comments/show/${showId}`, {
    params: query,
  });
  return response.data;
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  const response = await api.post<Comment>("/comments", input);
  return response.data;
}

export async function updateComment(input: UpdateCommentInput): Promise<Comment> {
  const response = await api.patch<Comment>(`/comments/${input.id}`, {
    content: input.content,
    images: input.images,
    isSpoiler: input.isSpoiler,
  });
  return response.data;
}

export async function deleteComment(id: string): Promise<void> {
  await api.delete(`/comments/${id}`);
}

export async function likeComment(id: string): Promise<void> {
  await api.post(`/comments/${id}/like`);
}

export async function unlikeComment(id: string): Promise<void> {
  await api.delete(`/comments/${id}/like`);
}

export async function addReaction(id: string, emoji: string): Promise<void> {
  await api.post(`/comments/${id}/reactions`, { emoji });
}

export async function removeReaction(id: string, emoji: string): Promise<void> {
  await api.delete(`/comments/${id}/reactions`, { data: { emoji } });
}

export async function getCommentById(commentId: string): Promise<Comment> {
  const response = await api.get<Comment>(`/comments/${commentId}`);
  return response.data;
}

export async function listRepliesForComment(
  commentId: string,
  page: number = 1,
  limit: number = 20,
): Promise<ListRepliesResult> {
  const response = await api.get<ListRepliesResult>(`/comments/${commentId}/replies`, {
    params: { page, limit },
  });
  return response.data;
}
