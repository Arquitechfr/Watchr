import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  addReaction,
  removeReaction,
  type CreateCommentInput,
  type UpdateCommentInput,
  type ListCommentsQuery,
} from "../services/comments.service";

export function useCreateComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", "show", showId, query];

  return useMutation({
    mutationFn: (input: Omit<CreateCommentInput, "showId">) =>
      createComment({ ...input, showId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["comments", "count", showId] });
    },
  });
}

export function useUpdateComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", "show", showId, query];

  return useMutation({
    mutationFn: (input: UpdateCommentInput) => updateComment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", "show", showId, query];

  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["comments", "count", showId] });
    },
  });
}

export function useLikeComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", "show", showId, query];

  return useMutation({
    mutationFn: (id: string) => likeComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUnlikeComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", "show", showId, query];

  return useMutation({
    mutationFn: (id: string) => unlikeComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useAddReaction(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", "show", showId, query];

  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => addReaction(id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useRemoveReaction(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();
  const queryKey = ["comments", "show", showId, query];

  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => removeReaction(id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
