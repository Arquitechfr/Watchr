import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  listTracking,
  upsertTracking,
  toggleEpisode,
  deleteTracking,
  markUpTo,
  markAllAired,
  toggleDropped,
  addToWatchlistByTmdb,
  addToWatchlistBatch,
  getTrackedTmdbIds,
  BatchAddItem,
  BatchAddResult,
  WatchStatus,
  UpsertTrackingInput,
  ToggleEpisodeInput,
  MarkUpToInput,
  MarkAllAiredInput,
  WatchEntry,
  WatchedEpisode,
} from "../services/tracking.service";
import type { UnwatchedShow } from "../services/unwatched.service";
import { log } from "../utils/logger";
import { useAuthStore } from "../store/authStore";

const TRACKING_QUERY_KEY = "tracking";

export function useTrackingList(status?: WatchStatus) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useInfiniteQuery({
    queryKey: [TRACKING_QUERY_KEY, { status }],
    queryFn: ({ pageParam = 1 }) => listTracking(pageParam, 20, status),
    initialPageParam: 1,
    enabled: isHydrated,
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

export function useMarkAllAired(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarkAllAiredInput) => markAllAired(showId, input),
    onMutate: (input) => {
      log("useTracking", "markAllAired mutate", { showId, ...input });
    },
    onSuccess: () => {
      log("useTracking", "markAllAired success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", showId] });
    },
    onError: (err) => {
      log("useTracking", "markAllAired error", { showId, err });
    },
  });
}

export function useToggleDropped(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dropped: boolean) => toggleDropped(showId, dropped),
    onMutate: (dropped) => {
      log("useTracking", "toggleDropped mutate", { showId, dropped });
    },
    onSuccess: () => {
      log("useTracking", "toggleDropped success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", showId] });
    },
    onError: (err) => {
      log("useTracking", "toggleDropped error", { showId, err });
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
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", showId] });
    },
    onError: (err) => {
      log("useTracking", "delete error", { showId, err });
    },
  });
}

export function useQuickAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tmdbId, type }: { tmdbId: number; type: "tv" | "movie" }) => addToWatchlistByTmdb(tmdbId, type),
    onMutate: ({ tmdbId }) => {
      log("useTracking", "quickAdd mutate", { tmdbId });
    },
    onSuccess: () => {
      log("useTracking", "quickAdd success");
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY, "tmdb-ids"] });
    },
    onError: (err) => {
      log("useTracking", "quickAdd error", { err });
    },
  });
}

export function useQuickMarkWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId, season, episode }: { showId: string; season: number; episode: number }) =>
      toggleEpisode(showId, { season, episode, watched: true }),
    onMutate: ({ showId, season, episode }) => {
      log("useTracking", "quickMarkWatched mutate", { showId, season, episode });
    },
    onSuccess: () => {
      log("useTracking", "quickMarkWatched success");
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
    },
    onError: (err) => {
      log("useTracking", "quickMarkWatched error", { err });
    },
  });
}

export function useQuickMarkAllAired() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId }: { showId: string }) =>
      markAllAired(showId, {}),
    onMutate: async ({ showId }) => {
      log("useTracking", "quickMarkAllAired mutate", { showId });
      await queryClient.cancelQueries({ queryKey: ["unwatched"] });
      const previousUnwatched = queryClient.getQueryData<{ shows: UnwatchedShow[] }>(["unwatched", "tv"]);
      queryClient.setQueryData<{ shows: UnwatchedShow[] } | undefined>(["unwatched", "tv"], (old: { shows: UnwatchedShow[] } | undefined) => {
        if (!old) return old;
        return { ...old, shows: old.shows.filter((s) => s.showId !== showId) };
      });
      return { previousUnwatched };
    },
    onError: (err, _vars, context) => {
      log("useTracking", "quickMarkAllAired error", { err });
      if (context?.previousUnwatched) {
        queryClient.setQueryData(["unwatched", "tv"], context.previousUnwatched);
      }
    },
    onSuccess: () => {
      log("useTracking", "quickMarkAllAired success");
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
    },
  });
}

export function useQuickMarkMovieWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ showId }: { showId: string }) =>
      upsertTracking(showId, { status: "completed" }),
    onMutate: ({ showId }) => {
      log("useTracking", "quickMarkMovieWatched mutate", { showId });
    },
    onSuccess: () => {
      log("useTracking", "quickMarkMovieWatched success");
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
    },
    onError: (err) => {
      log("useTracking", "quickMarkMovieWatched error", { err });
    },
  });
}

export function useTrackedTmdbIds() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [TRACKING_QUERY_KEY, "tmdb-ids"],
    queryFn: () => getTrackedTmdbIds(),
    enabled: isHydrated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddToWatchlistBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: BatchAddItem[]) => addToWatchlistBatch(items),
    onMutate: (items) => {
      log("useTracking", "batchAdd mutate", { itemCount: items.length });
    },
    onSuccess: (data) => {
      log("useTracking", "batchAdd success", { added: data.added, failed: data.failed });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY, "tmdb-ids"] });
    },
    onError: (err) => {
      log("useTracking", "batchAdd error", { err });
    },
  });
}
