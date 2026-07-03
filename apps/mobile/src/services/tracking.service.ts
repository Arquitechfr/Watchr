import { log } from "../utils/logger";
import { api } from "./api";

export type WatchStatus = "watching" | "completed" | "plan_to_watch" | "dropped";

export interface WatchedEpisode {
  season: number;
  episode: number;
  watchedAt: string;
}

export interface WatchEntry {
  id: string;
  showId: string;
  status: WatchStatus;
  watchedEpisodes: WatchedEpisode[];
  currentSeason?: number;
  currentEpisode?: number;
  show: {
    tmdbId: number;
    title: string;
    posterPath?: string;
    type: "tv" | "movie";
  };
}

export interface PaginatedTracking {
  data: WatchEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpsertTrackingInput {
  currentSeason?: number;
  currentEpisode?: number;
}

export interface ToggleEpisodeInput {
  season: number;
  episode: number;
  watched: boolean;
}

export interface MarkUpToInput {
  season: number;
  episode: number;
  includePrevious: boolean;
}

export async function listTracking(
  page: number = 1,
  limit: number = 20,
  status?: WatchStatus,
): Promise<PaginatedTracking> {
  log("TrackingService", "list", { page, limit, status });
  const response = await api.get<PaginatedTracking>("/tracking", {
    params: { page, limit, status },
  });
  log("TrackingService", "list response", { count: response.data.data.length, total: response.data.pagination.total });
  return response.data;
}

export async function upsertTracking(
  showId: string,
  input: UpsertTrackingInput,
): Promise<WatchEntry> {
  log("TrackingService", "upsert", { showId, ...input });
  const response = await api.post<WatchEntry>(`/tracking/${showId}`, input);
  log("TrackingService", "upsert response", { status: response.data.status });
  return response.data;
}

export async function toggleEpisode(
  showId: string,
  input: ToggleEpisodeInput,
): Promise<WatchEntry> {
  log("TrackingService", "toggleEpisode", { showId, ...input });
  const response = await api.patch<WatchEntry>(`/tracking/${showId}/episodes`, input);
  log("TrackingService", "toggleEpisode response", { status: response.data.status });
  return response.data;
}

export async function markUpTo(showId: string, input: MarkUpToInput): Promise<WatchEntry> {
  log("TrackingService", "markUpTo", { showId, ...input });
  const response = await api.post<WatchEntry>(`/tracking/${showId}/mark-up-to`, input);
  log("TrackingService", "markUpTo response", { status: response.data.status });
  return response.data;
}

export async function deleteTracking(showId: string): Promise<void> {
  log("TrackingService", "delete", { showId });
  await api.delete(`/tracking/${showId}`);
  log("TrackingService", "delete success");
}

export async function toggleDropped(showId: string, dropped: boolean): Promise<WatchEntry> {
  log("TrackingService", "toggleDropped", { showId, dropped });
  const response = await api.patch<WatchEntry>(`/tracking/${showId}/dropped`, { dropped });
  log("TrackingService", "toggleDropped response", { status: response.data.status });
  return response.data;
}

export async function addToWatchlistByTmdb(tmdbId: number, type: "tv" | "movie"): Promise<WatchEntry> {
  log("TrackingService", "addToWatchlistByTmdb", { tmdbId, type });
  const response = await api.post<WatchEntry>(`/tracking/by-tmdb/${tmdbId}`, { type });
  log("TrackingService", "addToWatchlistByTmdb response", { status: response.data.status });
  return response.data;
}

export async function getTrackedTmdbIds(): Promise<number[]> {
  log("TrackingService", "getTrackedTmdbIds");
  const response = await api.get<{ tmdbIds: number[] }>("/tracking/tmdb-ids");
  log("TrackingService", "getTrackedTmdbIds response", { count: response.data.tmdbIds.length });
  return response.data.tmdbIds;
}
