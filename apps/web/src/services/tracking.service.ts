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
  totalEpisodes?: number;
  watchedCount?: number;
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
  status?: WatchStatus;
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

export interface MarkAllAiredInput {
  season?: number;
}

export async function listTracking(
  page: number = 1,
  limit: number = 20,
  status?: WatchStatus,
): Promise<PaginatedTracking> {
  const response = await api.get<PaginatedTracking>("/tracking", {
    params: { page, limit, status },
  });
  return response.data;
}

export async function getTrackingEntry(showId: string): Promise<WatchEntry | null> {
  const response = await api.get<WatchEntry>(`/tracking/${showId}`);
  return response.data;
}

export async function upsertTracking(
  showId: string,
  input: UpsertTrackingInput,
): Promise<WatchEntry> {
  const response = await api.post<WatchEntry>(`/tracking/${showId}`, input);
  return response.data;
}

export async function toggleEpisode(
  showId: string,
  input: ToggleEpisodeInput,
): Promise<WatchEntry> {
  const response = await api.patch<WatchEntry>(`/tracking/${showId}/episodes`, input);
  return response.data;
}

export async function markUpTo(showId: string, input: MarkUpToInput): Promise<WatchEntry> {
  const response = await api.post<WatchEntry>(`/tracking/${showId}/mark-up-to`, input);
  return response.data;
}

export async function markAllAired(showId: string, input: MarkAllAiredInput): Promise<WatchEntry> {
  const response = await api.post<WatchEntry>(`/tracking/${showId}/mark-all-aired`, input);
  return response.data;
}

export async function deleteTracking(showId: string): Promise<void> {
  await api.delete(`/tracking/${showId}`);
}

export async function unmarkSeason(showId: string, season: number): Promise<WatchEntry> {
  const response = await api.post<WatchEntry>(`/tracking/${showId}/unmark-season`, { season });
  return response.data;
}

export async function toggleDropped(showId: string, dropped: boolean): Promise<WatchEntry> {
  const response = await api.patch<WatchEntry>(`/tracking/${showId}/dropped`, { dropped });
  return response.data;
}

export async function addToWatchlistByTmdb(tmdbId: number, type: "tv" | "movie"): Promise<WatchEntry> {
  const response = await api.post<WatchEntry>(`/tracking/by-tmdb/${tmdbId}`, { type });
  return response.data;
}

export async function getTrackedTmdbIds(): Promise<number[]> {
  const response = await api.get<{ tmdbIds: number[] }>("/tracking/tmdb-ids");
  return response.data.tmdbIds;
}

export interface BatchAddItem {
  tmdbId: number;
  type: "tv" | "movie";
}

export interface BatchAddResult {
  added: number;
  failed: number;
  failedIds: string[];
}

export async function addToWatchlistBatch(items: BatchAddItem[]): Promise<BatchAddResult> {
  const response = await api.post<BatchAddResult>("/tracking/batch-by-tmdb", { items });
  return response.data;
}
