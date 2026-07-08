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
  unmarkSeason,
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

type InfiniteTrackingData = {
  pages: { data: WatchEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }[];
  pageParams: unknown[];
};

function updateTrackingListEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  showId: string,
  updater: (entry: WatchEntry) => WatchEntry,
) {
  queryClient.setQueriesData<InfiniteTrackingData>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        return key[0] === "tracking" && key[1] !== "entry" && key[1] !== "tmdb-ids";
      },
    },
    (old: InfiniteTrackingData | undefined) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: { data: WatchEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }) => ({
          ...page,
          data: page.data.map((entry: WatchEntry) => (entry.showId === showId ? updater(entry) : entry)),
        })),
      };
    },
  );
}

function updateTrackingEntryCache(
  queryClient: ReturnType<typeof useQueryClient>,
  showId: string,
  updater: (entry: WatchEntry | null) => WatchEntry | null,
) {
  const key = ["tracking", "entry", showId];
  const prev = queryClient.getQueryData<WatchEntry | null>(key);
  if (prev !== undefined) {
    queryClient.setQueryData(key, updater(prev));
  }
}

export function useTrackingList(status?: WatchStatus) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useInfiniteQuery({
    queryKey: [TRACKING_QUERY_KEY, { status }],
    queryFn: ({ pageParam = 1 }) => listTracking(pageParam, 20, status),
    initialPageParam: 1,
    enabled: isHydrated,
    staleTime: 60 * 1000,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useUpsertTracking(showId: string, tmdbId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertTrackingInput) => upsertTracking(showId, input),
    onMutate: async (input) => {
      log("useTracking", "upsert mutate", { showId, ...input });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      updateTrackingEntryCache(queryClient, showId, (entry) => {
        if (!entry) return entry;
        return {
          ...entry,
          status: input.status ?? entry.status,
          currentSeason: input.currentSeason ?? entry.currentSeason,
          currentEpisode: input.currentEpisode ?? entry.currentEpisode,
        };
      });

      if (input.status) {
        updateTrackingListEntry(queryClient, showId, (entry) => ({
          ...entry,
          status: input.status!,
        }));
      }

      return { previousEntry };
    },
    onError: (err, _input, context) => {
      log("useTracking", "upsert error", { showId, err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", showId], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "upsert success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      }
    },
  });
}

export function useToggleEpisode(showId: string, tmdbId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ToggleEpisodeInput) => toggleEpisode(showId, input),
    onMutate: async (input) => {
      log("useTracking", "toggleEpisode mutate", { showId, ...input });
      await queryClient.cancelQueries({ queryKey: [TRACKING_QUERY_KEY] });

      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      updateTrackingEntryCache(queryClient, showId, (entry) => {
        if (!entry) return entry;
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

      updateTrackingListEntry(queryClient, showId, (entry) => {
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

      return { previousEntry };
    },
    onError: (err, _input, context) => {
      log("useTracking", "toggleEpisode error", { showId, err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", showId], context.previousEntry);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      }
    },
  });
}

export function useMarkUpTo(showId: string, tmdbId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarkUpToInput) => markUpTo(showId, input),
    onMutate: async (input) => {
      log("useTracking", "markUpTo mutate", { showId, ...input });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      updateTrackingEntryCache(queryClient, showId, (entry) => {
        if (!entry) return entry;
        return {
          ...entry,
          currentSeason: input.season,
          currentEpisode: input.episode,
        };
      });

      return { previousEntry };
    },
    onError: (err, _input, context) => {
      log("useTracking", "markUpTo error", { showId, err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", showId], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "markUpTo success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      }
    },
  });
}

export function useMarkAllAired(showId: string, tmdbId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarkAllAiredInput) => markAllAired(showId, input),
    onMutate: async (input) => {
      log("useTracking", "markAllAired mutate", { showId, ...input });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);
      return { previousEntry };
    },
    onError: (err, _input, context) => {
      log("useTracking", "markAllAired error", { showId, err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", showId], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "markAllAired success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      }
    },
  });
}

export function useToggleDropped(showId: string, tmdbId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dropped: boolean) => toggleDropped(showId, dropped),
    onMutate: async (dropped) => {
      log("useTracking", "toggleDropped mutate", { showId, dropped });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      updateTrackingEntryCache(queryClient, showId, (entry) => {
        if (!entry) return entry;
        return { ...entry, status: dropped ? "dropped" : "plan_to_watch" };
      });

      updateTrackingListEntry(queryClient, showId, (entry) => ({
        ...entry,
        status: dropped ? "dropped" : "plan_to_watch",
      }));

      return { previousEntry };
    },
    onError: (err, _dropped, context) => {
      log("useTracking", "toggleDropped error", { showId, err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", showId], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "toggleDropped success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      }
    },
  });
}

export function useDeleteTracking(showId: string, tmdbId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteTracking(showId),
    onMutate: async () => {
      log("useTracking", "delete mutate", { showId });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      queryClient.setQueryData(["tracking", "entry", showId], null);

      queryClient.setQueriesData<InfiniteTrackingData>(
        {
          predicate: (query) => {
            const key = query.queryKey;
            return key[0] === "tracking" && key[1] !== "entry" && key[1] !== "tmdb-ids";
          },
        },
        (old: InfiniteTrackingData | undefined) => {
          if (!old || !old.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: { data: WatchEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }) => ({
              ...page,
              data: page.data.filter((entry: WatchEntry) => entry.showId !== showId),
            })),
          };
        },
      );

      return { previousEntry };
    },
    onError: (err, _vars, context) => {
      log("useTracking", "delete error", { showId, err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", showId], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "delete success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      }
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
    onMutate: async ({ showId, season, episode }) => {
      log("useTracking", "quickMarkWatched mutate", { showId, season, episode });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      updateTrackingEntryCache(queryClient, showId, (entry) => {
        if (!entry) return entry;
        const exists = entry.watchedEpisodes.some(
          (ep: WatchedEpisode) => ep.season === season && ep.episode === episode,
        );
        if (!exists) {
          return {
            ...entry,
            watchedEpisodes: [
              ...entry.watchedEpisodes,
              { season, episode, watchedAt: new Date().toISOString() },
            ],
          };
        }
        return entry;
      });

      return { previousEntry };
    },
    onError: (err, _vars, context) => {
      log("useTracking", "quickMarkWatched error", { err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", context.previousEntry?.showId ?? ""], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "quickMarkWatched success");
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
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
    onMutate: async ({ showId }) => {
      log("useTracking", "quickMarkMovieWatched mutate", { showId });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      updateTrackingEntryCache(queryClient, showId, (entry) => {
        if (!entry) return entry;
        return { ...entry, status: "completed" as WatchStatus };
      });

      return { previousEntry };
    },
    onError: (err, _vars, context) => {
      log("useTracking", "quickMarkMovieWatched error", { err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", context.previousEntry?.showId ?? ""], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "quickMarkMovieWatched success");
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
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

export function useUnmarkSeason(showId: string, tmdbId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (season: number) => unmarkSeason(showId, season),
    onMutate: async (season) => {
      log("useTracking", "unmarkSeason mutate", { showId, season });
      await queryClient.cancelQueries({ queryKey: ["tracking", "entry", showId] });
      const previousEntry = queryClient.getQueryData<WatchEntry | null>(["tracking", "entry", showId]);

      updateTrackingEntryCache(queryClient, showId, (entry) => {
        if (!entry) return entry;
        return {
          ...entry,
          watchedEpisodes: entry.watchedEpisodes.filter((ep) => ep.season !== season),
        };
      });

      updateTrackingListEntry(queryClient, showId, (entry) => ({
        ...entry,
        watchedEpisodes: entry.watchedEpisodes.filter((ep) => ep.season !== season),
      }));

      return { previousEntry };
    },
    onError: (err, _season, context) => {
      log("useTracking", "unmarkSeason error", { showId, err });
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(["tracking", "entry", showId], context.previousEntry);
      }
    },
    onSuccess: () => {
      log("useTracking", "unmarkSeason success", { showId });
      queryClient.invalidateQueries({ queryKey: [TRACKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      }
    },
  });
}
