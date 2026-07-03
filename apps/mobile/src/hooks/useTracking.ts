import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  listTracking,
  upsertTracking,
  toggleEpisode,
  deleteTracking,
  markUpTo,
  WatchStatus,
  UpsertTrackingInput,
  ToggleEpisodeInput,
  MarkUpToInput,
  WatchEntry,
  WatchedEpisode,
} from "../services/tracking.service";
import { log } from "../utils/logger";

const TRACKING_QUERY_KEY = "tracking";

export function useTrackingList(status?: WatchStatus) {
  return useInfiniteQuery({
    queryKey: [TRACKING_QUERY_KEY, { status }],
    queryFn: ({ pageParam = 1 }) => listTracking(pageParam, 20, status),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useUpsertTracking(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertTrackingInput) => upsertTracking(showId, input),
    onMutate: (input) => {
      log("useTracking", "upsert mutate", { showId, ...input });
    },
    onSuccess: () => {
      log("useTracking", "upsert success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", showId] });
    },
    onError: (err) => {
      log("useTracking", "upsert error", { showId, err });
    },
  });
}

export function useToggleEpisode(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ToggleEpisodeInput) => toggleEpisode(showId, input),
    onMutate: async (input) => {
      log("useTracking", "toggleEpisode mutate", { showId, ...input });
      await queryClient.cancelQueries({ queryKey: [TRACKING_QUERY_KEY] });
      const previousEntries = queryClient.getQueryData<WatchEntry[]>([TRACKING_QUERY_KEY]);

      queryClient.setQueryData<WatchEntry[]>([TRACKING_QUERY_KEY], (old: WatchEntry[] | undefined) => {
        if (!old) return old;
        return old.map((entry: WatchEntry) => {
          if (entry.showId !== showId) return entry;
          const exists = entry.watchedEpisodes.some(
            (ep: WatchedEpisode) => ep.season === input.season && ep.episode === input.episode,
          );
          if (input.watched && !exists) {
            return {
              ...entry,
              watchedEpisodes: [
                ...entry.watchedEpisodes,
                { season: input.season, episode: input.episode, watchedAt: new Date().toISOString() },
              ],
            };
          }
          if (!input.watched && exists) {
            return {
              ...entry,
              watchedEpisodes: entry.watchedEpisodes.filter(
                (ep) => !(ep.season === input.season && ep.episode === input.episode),
              ),
            };
          }
          return entry;
        });
      });

      return { previousEntries };
    },
    onError: (err, _input, context) => {
      log("useTracking", "toggleEpisode error", { showId, err });
      if (context?.previousEntries) {
        queryClient.setQueryData([TRACKING_QUERY_KEY], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
    },
  });
}

export function useMarkUpTo(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarkUpToInput) => markUpTo(showId, input),
    onMutate: (input) => {
      log("useTracking", "markUpTo mutate", { showId, ...input });
    },
    onSuccess: () => {
      log("useTracking", "markUpTo success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", showId] });
    },
    onError: (err) => {
      log("useTracking", "markUpTo error", { showId, err });
    },
  });
}

export function useDeleteTracking(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteTracking(showId),
    onMutate: () => {
      log("useTracking", "delete mutate", { showId });
    },
    onSuccess: () => {
      log("useTracking", "delete success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
    },
    onError: (err) => {
      log("useTracking", "delete error", { showId, err });
    },
  });
}
