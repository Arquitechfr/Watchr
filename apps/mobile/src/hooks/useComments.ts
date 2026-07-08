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
  Comment,
  ListCommentsResult,
} from "../services/comments.service";
import { log } from "../utils/logger";
import { useAuthStore } from "../store/authStore";

const COMMENTS_QUERY_KEY = "comments";

function getCommentsQueryKey(showId: string, query?: ListCommentsQuery) {
  return [COMMENTS_QUERY_KEY, showId, query?.season, query?.episode, query?.sort];
}

function getCommentCountQueryKey(showId: string, query?: { season?: number; episode?: number }) {
  return [COMMENTS_QUERY_KEY, "count", showId, query?.season, query?.episode];
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
    queryKey: getCommentCountQueryKey(showId, query),
    queryFn: () => getCommentCount(showId, query),
    enabled: isHydrated && Boolean(showId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateCommentInput, "showId">) => createComment({ ...input, showId }),
    onMutate: (input) => {
      log("useComments", "create mutate", { showId, episodeRef: input.episodeRef, parentId: input.parentId });

      const listKey = getCommentsQueryKey(showId, query);
      const countKey = getCommentCountQueryKey(showId, { season: query?.season, episode: query?.episode });

      queryClient.cancelQueries({ queryKey: listKey });

      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);
      const prevCount = queryClient.getQueryData<{ total: number }>(countKey);

      const userId = useAuthStore.getState().userId ?? "";
      const me = queryClient.getQueryData<{ username: string; avatarUrl?: string }>(["me"]);
      const now = new Date().toISOString();
      const optimisticComment: Comment = {
        id: `optimistic-${Date.now()}`,
        userId,
        authorUsername: me?.username ?? "",
        authorAvatarUrl: me?.avatarUrl,
        content: input.content,
        images: input.images ?? [],
        isSpoiler: input.isSpoiler ?? false,
        likesCount: 0,
        replyCount: 0,
        likedByMe: false,
        reactions: [],
        createdAt: now,
        updatedAt: now,
      };

      if (prevList) {
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          total: prevList.total + 1,
          comments: [optimisticComment, ...prevList.comments],
        });
      }

      if (prevCount) {
        queryClient.setQueryData<{ total: number }>(countKey, { total: prevCount.total + 1 });
      }

      return { prevList, prevCount, optimisticId: optimisticComment.id };
    },
    onSuccess: (data, _input, ctx) => {
      log("useComments", "create success", { showId, id: data.id });
      const listKey = getCommentsQueryKey(showId, query);
      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);
      if (prevList && ctx?.optimisticId) {
        const normalized: Comment = {
          ...data,
          images: data.images ?? [],
          reactions: data.reactions ?? [],
        };
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          comments: prevList.comments.map((c) =>
            c.id === ctx.optimisticId ? normalized : c,
          ),
        });
      }
    },
    onError: (err, _input, ctx) => {
      log("useComments", "create error", { showId, err });
      const listKey = getCommentsQueryKey(showId, query);
      const countKey = getCommentCountQueryKey(showId, { season: query?.season, episode: query?.episode });
      if (ctx?.prevList) queryClient.setQueryData(listKey, ctx.prevList);
      if (ctx?.prevCount) queryClient.setQueryData(countKey, ctx.prevCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
      queryClient.invalidateQueries({ queryKey: getCommentCountQueryKey(showId) });
    },
  });
}

export function useUpdateComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCommentInput) => updateComment(input),
    onMutate: (input) => {
      log("useComments", "update mutate", { showId, id: input.id });

      const listKey = getCommentsQueryKey(showId, query);
      queryClient.cancelQueries({ queryKey: listKey });

      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);

      if (prevList) {
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          comments: prevList.comments.map((c) =>
            c.id === input.id
              ? { ...c, content: input.content, images: input.images ?? c.images, isSpoiler: input.isSpoiler ?? c.isSpoiler, updatedAt: new Date().toISOString() }
              : c,
          ),
        });
      }

      return { prevList };
    },
    onError: (err, _input, ctx) => {
      log("useComments", "update error", { showId, err });
      const listKey = getCommentsQueryKey(showId, query);
      if (ctx?.prevList) queryClient.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
  });
}

export function useDeleteComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onMutate: (id) => {
      log("useComments", "delete mutate", { showId, id });

      const listKey = getCommentsQueryKey(showId, query);
      const countKey = getCommentCountQueryKey(showId, { season: query?.season, episode: query?.episode });

      queryClient.cancelQueries({ queryKey: listKey });

      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);
      const prevCount = queryClient.getQueryData<{ total: number }>(countKey);

      if (prevList) {
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          total: Math.max(0, prevList.total - 1),
          comments: prevList.comments.filter((c) => c.id !== id),
        });
      }

      if (prevCount) {
        queryClient.setQueryData<{ total: number }>(countKey, { total: Math.max(0, prevCount.total - 1) });
      }

      return { prevList, prevCount };
    },
    onError: (err, _id, ctx) => {
      log("useComments", "delete error", { showId, err });
      const listKey = getCommentsQueryKey(showId, query);
      const countKey = getCommentCountQueryKey(showId, { season: query?.season, episode: query?.episode });
      if (ctx?.prevList) queryClient.setQueryData(listKey, ctx.prevList);
      if (ctx?.prevCount) queryClient.setQueryData(countKey, ctx.prevCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
      queryClient.invalidateQueries({ queryKey: getCommentCountQueryKey(showId) });
    },
  });
}

export function useLikeComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => likeComment(id),
    onMutate: (id) => {
      const listKey = getCommentsQueryKey(showId, query);
      queryClient.cancelQueries({ queryKey: listKey });

      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);

      if (prevList) {
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          comments: prevList.comments.map((c) =>
            c.id === id ? { ...c, likedByMe: true, likesCount: c.likesCount + 1 } : c,
          ),
        });
      }

      return { prevList };
    },
    onError: (err, _id, ctx) => {
      log("useComments", "like error", { showId, err });
      const listKey = getCommentsQueryKey(showId, query);
      if (ctx?.prevList) queryClient.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
  });
}

export function useUnlikeComment(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unlikeComment(id),
    onMutate: (id) => {
      const listKey = getCommentsQueryKey(showId, query);
      queryClient.cancelQueries({ queryKey: listKey });

      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);

      if (prevList) {
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          comments: prevList.comments.map((c) =>
            c.id === id ? { ...c, likedByMe: false, likesCount: Math.max(0, c.likesCount - 1) } : c,
          ),
        });
      }

      return { prevList };
    },
    onError: (err, _id, ctx) => {
      log("useComments", "unlike error", { showId, err });
      const listKey = getCommentsQueryKey(showId, query);
      if (ctx?.prevList) queryClient.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
  });
}

export function useAddReaction(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => addReaction(id, emoji),
    onMutate: ({ id, emoji }) => {
      const listKey = getCommentsQueryKey(showId, query);
      queryClient.cancelQueries({ queryKey: listKey });

      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);

      if (prevList) {
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          comments: prevList.comments.map((c) => {
            if (c.id !== id) return c;
            const existing = c.reactions.find((r) => r.emoji === emoji);
            if (existing) {
              return {
                ...c,
                reactions: c.reactions.map((r) =>
                  r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r,
                ),
              };
            }
            return {
              ...c,
              reactions: [...c.reactions, { emoji, count: 1, reactedByMe: true }],
            };
          }),
        });
      }

      return { prevList };
    },
    onError: (err, _vars, ctx) => {
      log("useComments", "addReaction error", { showId, err });
      const listKey = getCommentsQueryKey(showId, query);
      if (ctx?.prevList) queryClient.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
    },
  });
}

export function useRemoveReaction(showId: string, query?: ListCommentsQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => removeReaction(id, emoji),
    onMutate: ({ id, emoji }) => {
      const listKey = getCommentsQueryKey(showId, query);
      queryClient.cancelQueries({ queryKey: listKey });

      const prevList = queryClient.getQueryData<ListCommentsResult>(listKey);

      if (prevList) {
        queryClient.setQueryData<ListCommentsResult>(listKey, {
          ...prevList,
          comments: prevList.comments.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              reactions: c.reactions
                .map((r) =>
                  r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), reactedByMe: false } : r,
                )
                .filter((r) => r.count > 0),
            };
          }),
        });
      }

      return { prevList };
    },
    onError: (err, _vars, ctx) => {
      log("useComments", "removeReaction error", { showId, err });
      const listKey = getCommentsQueryKey(showId, query);
      if (ctx?.prevList) queryClient.setQueryData(listKey, ctx.prevList);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(showId, query) });
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
