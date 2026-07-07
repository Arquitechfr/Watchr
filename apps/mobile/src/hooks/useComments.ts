import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCommentsForShow,
  getCommentCount,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  addReaction,
  removeReaction,
  getCommentById,
  listRepliesForComment,
  CreateCommentInput,
  UpdateCommentInput,
  ListCommentsQuery,
} from "../services/comments.service";
import { log } from "../utils/logger";
import { useAuthStore } from "../store/authStore";

const COMMENTS_QUERY_KEY = "comments";

function getCommentsQueryKey(showId: string, query?: ListCommentsQuery) {
  return [COMMENTS_QUERY_KEY, showId, query?.season, query?.episode, query?.sort];
}

export function useCommentsForShow(showId: string, query?: ListCommentsQuery) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: getCommentsQueryKey(showId, query),
    queryFn: () => listCommentsForShow(showId, query),
    enabled: isHydrated && Boolean(showId),
  });
}

export function useCommentCount(showId: string, query?: { season?: number; episode?: number }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["comments", "count", showId, query?.season, query?.episode],
    queryFn: () => getCommentCount(showId, query),
    enabled: isHydrated && Boolean(showId),
  });
}

export function useCreateComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateCommentInput, "showId">) => createComment({ ...input, showId }),
    onMutate: (input) => {
      log("useComments", "create mutate", { showId, episodeRef: input.episodeRef, parentId: input.parentId });
    },
    onSuccess: () => {
      log("useComments", "create success", { showId });
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
      queryClient.invalidateQueries({ queryKey: ["comments", "count", showId] });
    },
    onError: (err) => {
      log("useComments", "create error", { showId, err });
    },
  });
}

export function useUpdateComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCommentInput) => updateComment(input),
    onMutate: (input) => {
      log("useComments", "update mutate", { showId, id: input.id });
    },
    onSuccess: () => {
      log("useComments", "update success", { showId });
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
    onError: (err) => {
      log("useComments", "update error", { showId, err });
    },
  });
}

export function useDeleteComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onMutate: (id) => {
      log("useComments", "delete mutate", { showId, id });
    },
    onSuccess: () => {
      log("useComments", "delete success", { showId });
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
      queryClient.invalidateQueries({ queryKey: ["comments", "count", showId] });
    },
    onError: (err) => {
      log("useComments", "delete error", { showId, err });
    },
  });
}

export function useLikeComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => likeComment(id),
    onSuccess: () => {
      log("useComments", "like success", { showId });
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
    onError: (err) => {
      log("useComments", "like error", { showId, err });
    },
  });
}

export function useUnlikeComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unlikeComment(id),
    onSuccess: () => {
      log("useComments", "unlike success", { showId });
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
    onError: (err) => {
      log("useComments", "unlike error", { showId, err });
    },
  });
}

export function useAddReaction(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => addReaction(id, emoji),
    onSuccess: () => {
      log("useComments", "addReaction success", { showId });
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
    onError: (err) => {
      log("useComments", "addReaction error", { showId, err });
    },
  });
}

export function useRemoveReaction(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => removeReaction(id, emoji),
    onSuccess: () => {
      log("useComments", "removeReaction success", { showId });
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
    onError: (err) => {
      log("useComments", "removeReaction error", { showId, err });
    },
  });
}

export function useComment(commentId: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [COMMENTS_QUERY_KEY, "single", commentId],
    queryFn: () => getCommentById(commentId),
    enabled: isHydrated && Boolean(commentId),
  });
}

export function useReplies(commentId: string, page: number = 1, limit: number = 20) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [COMMENTS_QUERY_KEY, "replies", commentId, page, limit],
    queryFn: () => listRepliesForComment(commentId, page, limit),
    enabled: isHydrated && Boolean(commentId),
  });
}
