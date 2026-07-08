import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  upsertTracking,
  toggleEpisode,
  markUpTo,
  markAllAired,
  deleteTracking,
  unmarkSeason,
  toggleDropped,
  addToWatchlistByTmdb,
  getTrackedTmdbIds,
  type UpsertTrackingInput,
  type WatchEntry,
} from "../services/tracking.service";

export function useUpsertTracking(showId: string, tmdbId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertTrackingInput) => upsertTracking(showId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(["tracking", "entry", showId], data);
      queryClient.invalidateQueries({ queryKey: ["tracking", "unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["tracking", "library"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
    },
  });
}

export function useToggleEpisode(showId: string, tmdbId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { season: number; episode: number; watched: boolean }) =>
      toggleEpisode(showId, input),
    onSuccess: (data: WatchEntry) => {
      queryClient.setQueryData(["tracking", "entry", showId], data);
      queryClient.invalidateQueries({ queryKey: ["tracking", "unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
    },
  });
}

export function useMarkUpTo(showId: string, tmdbId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { season: number; episode: number; includePrevious: boolean }) =>
      markUpTo(showId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(["tracking", "entry", showId], data);
      queryClient.invalidateQueries({ queryKey: ["tracking", "unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
    },
  });
}

export function useMarkAllAired(showId: string, tmdbId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { season?: number }) =>
      markAllAired(showId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(["tracking", "entry", showId], data);
      queryClient.invalidateQueries({ queryKey: ["tracking", "unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
    },
  });
}

export function useDeleteTracking(showId: string, tmdbId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      deleteTracking(showId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["tracking", "entry", showId] });
      queryClient.invalidateQueries({ queryKey: ["tracking", "unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["tracking", "library"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
    },
  });
}

export function useUnmarkSeason(showId: string, tmdbId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (season: number) =>
      unmarkSeason(showId, season),
    onSuccess: (data) => {
      queryClient.setQueryData(["tracking", "entry", showId], data);
      queryClient.invalidateQueries({ queryKey: ["tracking", "unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
    },
  });
}

export function useToggleDropped(showId: string, _tmdbId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dropped: boolean) =>
      toggleDropped(showId, dropped),
    onSuccess: (data) => {
      queryClient.setQueryData(["tracking", "entry", showId], data);
      queryClient.invalidateQueries({ queryKey: ["tracking", "unwatched"] });
    },
  });
}

export function useQuickAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tmdbId, type }: { tmdbId: number; type: "tv" | "movie" }) =>
      addToWatchlistByTmdb(tmdbId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
      queryClient.invalidateQueries({ queryKey: ["shows", "discover"] });
    },
  });
}

export function useTrackedTmdbIds() {
  return useQuery({
    queryKey: ["tracking", "tmdb-ids"],
    queryFn: () =>
      getTrackedTmdbIds(),
    staleTime: 30_000,
  });
}

