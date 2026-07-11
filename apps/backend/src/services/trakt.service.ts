import axios from "axios";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { TraktLink, ITraktLink } from "../models/traktLink.model.js";
import { ImportJob } from "../models/importJob.model.js";
import { getImportQueue } from "../workers/import.worker.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";
import { ParsedRecord } from "./import/types.js";
import { gatherExportData, ExportEntry } from "./export.service.js";
import * as fs from "fs";
import * as path from "path";

const TRAKT_API_BASE = "https://api.trakt.tv";
const TRAKT_OAUTH_BASE = "https://trakt.tv/oauth";

interface TraktTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

interface TraktUserSettings {
  user: {
    username: string;
    name?: string;
  };
}

interface TraktHistoryEntry {
  [key: string]: unknown;
  watched_at: string;
  type: string;
  episode?: { season: number; number: number; title?: string; ids: { trakt?: number; tmdb?: number; imdb?: string } };
  show?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
  movie?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
}

interface TraktRatingEntry {
  [key: string]: unknown;
  rated_at: string;
  rating: number;
  type: string;
  show?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
  movie?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
}

interface TraktWatchlistEntry {
  [key: string]: unknown;
  listed_at: string;
  type: string;
  show?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
  movie?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
}

export function getTraktAuthUrl(state: string): string {
  const clientId = env.TRAKT_CLIENT_ID;
  const redirectUri = `${env.PUBLIC_URL}/api/trakt/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId ?? "",
    redirect_uri: redirectUri,
    state,
  });
  return `${TRAKT_OAUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeTraktCode(code: string): Promise<TraktTokenResponse> {
  const redirectUri = `${env.PUBLIC_URL}/api/trakt/callback`;
  const response = await axios.post<TraktTokenResponse>(
    `${TRAKT_OAUTH_BASE}/token`,
    {
      code,
      client_id: env.TRAKT_CLIENT_ID,
      client_secret: env.TRAKT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
}

async function refreshTraktToken(refreshToken: string): Promise<TraktTokenResponse> {
  const response = await axios.post<TraktTokenResponse>(
    `${TRAKT_OAUTH_BASE}/token`,
    {
      refresh_token: refreshToken,
      client_id: env.TRAKT_CLIENT_ID,
      client_secret: env.TRAKT_CLIENT_SECRET,
      grant_type: "refresh_token",
    },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
}

async function getValidAccessToken(link: ITraktLink): Promise<string> {
  if (new Date() >= link.tokenExpiresAt) {
    log("TraktService", "token expired, refreshing");
    const tokens = await refreshTraktToken(link.refreshToken);
    link.accessToken = tokens.access_token;
    link.refreshToken = tokens.refresh_token;
    link.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await link.save();
  }
  return link.accessToken;
}

async function traktApiGet<T>(accessToken: string, endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TRAKT_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const response = await axios.get<T>(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "trakt-api-version": "2",
      "trakt-api-key": env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

async function traktApiPost<T>(accessToken: string, endpoint: string, body: unknown): Promise<T> {
  const url = `${TRAKT_API_BASE}${endpoint}`;
  const response = await axios.post<T>(url, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "trakt-api-version": "2",
      "trakt-api-key": env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

async function traktApiDelete<T>(accessToken: string, endpoint: string, body: unknown): Promise<T> {
  const url = `${TRAKT_API_BASE}${endpoint}`;
  const response = await axios.delete<T>(url, {
    data: body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "trakt-api-version": "2",
      "trakt-api-key": env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getTraktUsername(accessToken: string): Promise<string> {
  const settings = await traktApiGet<TraktUserSettings>(accessToken, "/users/settings");
  return settings.user.username;
}

export async function linkTraktAccount(userId: string, code: string): Promise<ITraktLink> {
  const tokens = await exchangeTraktCode(code);
  const username = await getTraktUsername(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const existing = await TraktLink.findOne({ userId: new Types.ObjectId(userId) });
  if (existing) {
    existing.traktUsername = username;
    existing.accessToken = tokens.access_token;
    existing.refreshToken = tokens.refresh_token;
    existing.tokenExpiresAt = expiresAt;
    await existing.save();
    return existing;
  }

  return TraktLink.create({
    userId: new Types.ObjectId(userId),
    traktUsername: username,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: expiresAt,
    autoSync: false,
  });
}

export async function unlinkTraktAccount(userId: string): Promise<void> {
  await TraktLink.deleteOne({ userId: new Types.ObjectId(userId) });
}

export async function getTraktLink(userId: string): Promise<ITraktLink | null> {
  return TraktLink.findOne({ userId: new Types.ObjectId(userId) });
}

export async function toggleTraktAutoSync(userId: string, enabled: boolean): Promise<ITraktLink | null> {
  const link = await TraktLink.findOne({ userId: new Types.ObjectId(userId) });
  if (!link) {
    throw new ApiError(404, "TRAKT_NOT_LINKED", "Trakt account not linked");
  }
  link.autoSync = enabled;
  await link.save();
  return link;
}

function convertTraktHistoryToRecords(entries: TraktHistoryEntry[]): ParsedRecord[] {
  return entries.map((entry) => {
    if (entry.show) {
      return {
        title: entry.show.title,
        year: entry.show.year,
        status: "watching",
        season: entry.episode?.season,
        episode: entry.episode?.number,
        watchedAt: entry.watched_at,
        type: "tv" as const,
        tmdbId: entry.show.ids?.tmdb,
        imdbId: entry.show.ids?.imdb,
      };
    }
    if (entry.movie) {
      return {
        title: entry.movie.title,
        year: entry.movie.year,
        status: "completed",
        watchedAt: entry.watched_at,
        type: "movie" as const,
        tmdbId: entry.movie.ids?.tmdb,
        imdbId: entry.movie.ids?.imdb,
      };
    }
    return { title: "" };
  });
}

function convertTraktRatingsToRecords(entries: TraktRatingEntry[]): ParsedRecord[] {
  return entries.map((entry) => {
    const base = { title: "", rating: entry.rating, watchedAt: entry.rated_at };
    if (entry.show) {
      return {
        ...base,
        title: entry.show.title,
        year: entry.show.year,
        type: "tv" as const,
        tmdbId: entry.show.ids?.tmdb,
        imdbId: entry.show.ids?.imdb,
      };
    }
    if (entry.movie) {
      return {
        ...base,
        title: entry.movie.title,
        year: entry.movie.year,
        type: "movie" as const,
        tmdbId: entry.movie.ids?.tmdb,
        imdbId: entry.movie.ids?.imdb,
      };
    }
    return base;
  });
}

function convertTraktWatchlistToRecords(entries: TraktWatchlistEntry[]): ParsedRecord[] {
  return entries.map((entry) => {
    if (entry.show) {
      return {
        title: entry.show.title,
        year: entry.show.year,
        status: "plan_to_watch",
        watchedAt: entry.listed_at,
        type: "tv" as const,
        tmdbId: entry.show.ids?.tmdb,
        imdbId: entry.show.ids?.imdb,
      };
    }
    if (entry.movie) {
      return {
        title: entry.movie.title,
        year: entry.movie.year,
        status: "plan_to_watch",
        watchedAt: entry.listed_at,
        type: "movie" as const,
        tmdbId: entry.movie.ids?.tmdb,
        imdbId: entry.movie.ids?.imdb,
      };
    }
    return { title: "" };
  });
}

export async function syncFromTrakt(userId: string): Promise<{ total: number; matched: number; failed: number }> {
  const link = await TraktLink.findOne({ userId: new Types.ObjectId(userId) });
  if (!link) {
    throw new ApiError(404, "TRAKT_NOT_LINKED", "Trakt account not linked");
  }

  const accessToken = await getValidAccessToken(link);
  log("TraktService", "fetching Trakt data", { username: link.traktUsername });

  const [history, ratings, watchlist] = await Promise.all([
    traktApiGet<TraktHistoryEntry[]>(accessToken, "/sync/history", { limit: "1000" }),
    traktApiGet<TraktRatingEntry[]>(accessToken, "/users/me/ratings", { limit: "1000" }),
    traktApiGet<TraktWatchlistEntry[]>(accessToken, "/sync/watchlist", { limit: "1000" }),
  ]);

  const records: ParsedRecord[] = [
    ...convertTraktHistoryToRecords(history),
    ...convertTraktRatingsToRecords(ratings),
    ...convertTraktWatchlistToRecords(watchlist),
  ];

  log("TraktService", "Trakt data fetched", { total: records.length });

  const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "watchr-trakt-"));
  const tempFile = path.join(tempDir, "trakt-sync.json");
  fs.writeFileSync(tempFile, JSON.stringify(records), "utf8");

  const job = await ImportJob.create({
    userId: new Types.ObjectId(userId),
    status: "pending",
    source: "trakt",
    sourceFile: tempFile,
  });

  await getImportQueue().add(
    "import",
    { userId, jobId: job._id.toString(), sourceFile: tempFile, source: "trakt" as const },
    { jobId: `trakt-sync-${job._id.toString()}`, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  );

  link.lastSyncAt = new Date();
  await link.save();

  return { total: records.length, matched: 0, failed: 0 };
}

interface TraktSyncDeltaResponse {
  [key: string]: unknown;
  added?: { movies?: number; shows?: number; episodes?: number; seasons?: number };
  updated?: { movies?: number; shows?: number; episodes?: number; seasons?: number };
  deleted?: { movies?: number; shows?: number; episodes?: number; seasons?: number };
  not_found?: { movies?: unknown[]; shows?: unknown[]; episodes?: unknown[]; seasons?: unknown[]; people?: unknown[] };
}

type TraktHistoryType = "movie" | "show" | "episode";

interface TraktHistoryItem {
  type: TraktHistoryType;
  tmdbId: number;
  season?: number;
  episode?: number;
  watchedAt: string;
  payload: Record<string, unknown>;
}

interface TraktRatingItem {
  type: "movie" | "show";
  tmdbId: number;
  rating: number;
  ratedAt: string;
  payload: Record<string, unknown>;
}

interface TraktWatchlistItem {
  type: "movie" | "show";
  tmdbId: number;
  listedAt: string;
  payload: Record<string, unknown>;
}

function getShowYear(show: ExportEntry["show"]): number | undefined {
  return show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : undefined;
}

function buildShowPayload(show: ExportEntry["show"]): Record<string, unknown> {
  return {
    title: show.title,
    year: getShowYear(show),
    ids: { tmdb: show.tmdbId },
  };
}

function buildHistoryKey(item: TraktHistoryItem): string {
  if (item.type === "episode") {
    return `episode:${item.tmdbId}:S${item.season}E${item.episode}`;
  }
  return `${item.type}:${item.tmdbId}`;
}

function buildRatingKey(item: TraktRatingItem): string {
  return `rating:${item.type}:${item.tmdbId}`;
}

function buildWatchlistKey(item: TraktWatchlistItem): string {
  return `watchlist:${item.type}:${item.tmdbId}`;
}

function buildPayloadFromItems(items: Array<{ type: string; payload: Record<string, unknown> }>): Record<string, Array<Record<string, unknown>>> {
  const payload: Record<string, Array<Record<string, unknown>>> = { movies: [], shows: [], episodes: [] };
  for (const item of items) {
    if (item.type === "movie") payload.movies.push(item.payload);
    else if (item.type === "show") payload.shows.push(item.payload);
    else if (item.type === "episode") payload.episodes.push(item.payload);
  }
  return payload;
}

function traktHistoryToItem(entry: TraktHistoryEntry): TraktHistoryItem | null {
  const watchedAt = entry.watched_at ?? new Date().toISOString();
  if (entry.episode && entry.show?.ids?.tmdb) {
    return {
      type: "episode",
      tmdbId: entry.show.ids.tmdb,
      season: entry.episode.season,
      episode: entry.episode.number,
      watchedAt,
      payload: entry,
    };
  }
  if (entry.show?.ids?.tmdb) {
    return {
      type: "show",
      tmdbId: entry.show.ids.tmdb,
      watchedAt,
      payload: entry,
    };
  }
  if (entry.movie?.ids?.tmdb) {
    return {
      type: "movie",
      tmdbId: entry.movie.ids.tmdb,
      watchedAt,
      payload: entry,
    };
  }
  return null;
}

function traktRatingToItem(entry: TraktRatingEntry): TraktRatingItem | null {
  if (entry.show?.ids?.tmdb) {
    return {
      type: "show",
      tmdbId: entry.show.ids.tmdb,
      rating: entry.rating,
      ratedAt: entry.rated_at,
      payload: entry,
    };
  }
  if (entry.movie?.ids?.tmdb) {
    return {
      type: "movie",
      tmdbId: entry.movie.ids.tmdb,
      rating: entry.rating,
      ratedAt: entry.rated_at,
      payload: entry,
    };
  }
  return null;
}

function traktWatchlistToItem(entry: TraktWatchlistEntry): TraktWatchlistItem | null {
  const listedAt = entry.listed_at ?? new Date().toISOString();
  if (entry.show?.ids?.tmdb) {
    return {
      type: "show",
      tmdbId: entry.show.ids.tmdb,
      listedAt,
      payload: entry,
    };
  }
  if (entry.movie?.ids?.tmdb) {
    return {
      type: "movie",
      tmdbId: entry.movie.ids.tmdb,
      listedAt,
      payload: entry,
    };
  }
  return null;
}

function watchrEntriesToHistoryItems(entries: ExportEntry[]): TraktHistoryItem[] {
  const items: TraktHistoryItem[] = [];
  for (const e of entries) {
    if (!e.show?.tmdbId) continue;
    const showData = buildShowPayload(e.show);
    if (e.show.type === "tv") {
      if (e.watchEntry.status === "plan_to_watch") continue;
      for (const ep of e.watchEntry.watchedEpisodes) {
        items.push({
          type: "episode",
          tmdbId: e.show.tmdbId,
          season: ep.season,
          episode: ep.episode,
          watchedAt: ep.watchedAt ? new Date(ep.watchedAt).toISOString() : new Date().toISOString(),
          payload: {
            watched_at: ep.watchedAt ? new Date(ep.watchedAt).toISOString() : new Date().toISOString(),
            type: "episode",
            show: showData,
            episode: { season: ep.season, number: ep.episode },
          },
        });
      }
      if (e.watchEntry.watchedEpisodes.length === 0 && e.watchEntry.status === "completed") {
        items.push({
          type: "show",
          tmdbId: e.show.tmdbId,
          watchedAt: new Date(e.watchEntry.updatedAt).toISOString(),
          payload: {
            watched_at: new Date(e.watchEntry.updatedAt).toISOString(),
            type: "show",
            show: showData,
          },
        });
      }
    } else {
      if (e.watchEntry.status === "plan_to_watch") continue;
      items.push({
        type: "movie",
        tmdbId: e.show.tmdbId,
        watchedAt: new Date(e.watchEntry.updatedAt).toISOString(),
        payload: {
          watched_at: new Date(e.watchEntry.updatedAt).toISOString(),
          type: "movie",
          movie: showData,
        },
      });
    }
  }
  return items;
}

function watchrEntriesToRatingItems(entries: ExportEntry[]): TraktRatingItem[] {
  const items: TraktRatingItem[] = [];
  for (const e of entries) {
    if (!e.show?.tmdbId || !e.rating?.value) continue;
    const type = e.show.type === "tv" ? "show" : "movie";
    const traktRating = e.rating.value * 2;
    items.push({
      type,
      tmdbId: e.show.tmdbId,
      rating: traktRating,
      ratedAt: new Date(e.rating.updatedAt).toISOString(),
      payload: {
        rated_at: new Date(e.rating.updatedAt).toISOString(),
        rating: traktRating,
        type,
        [type]: buildShowPayload(e.show),
      },
    });
  }
  return items;
}

function watchrEntriesToWatchlistItems(entries: ExportEntry[]): TraktWatchlistItem[] {
  const items: TraktWatchlistItem[] = [];
  for (const e of entries) {
    if (!e.show?.tmdbId || e.watchEntry.status !== "plan_to_watch") continue;
    const showData = buildShowPayload(e.show);
    if (e.show.type === "tv") {
      items.push({
        type: "show",
        tmdbId: e.show.tmdbId,
        listedAt: new Date(e.watchEntry.updatedAt).toISOString(),
        payload: {
          listed_at: new Date(e.watchEntry.updatedAt).toISOString(),
          type: "show",
          show: showData,
        },
      });
    } else {
      items.push({
        type: "movie",
        tmdbId: e.show.tmdbId,
        listedAt: new Date(e.watchEntry.updatedAt).toISOString(),
        payload: {
          listed_at: new Date(e.watchEntry.updatedAt).toISOString(),
          type: "movie",
          movie: showData,
        },
      });
    }
  }
  return items;
}

function computeHistoryDelta(watchrItems: TraktHistoryItem[], traktItems: TraktHistoryItem[]): { toAdd: TraktHistoryItem[]; toRemove: TraktHistoryItem[] } {
  const traktMap = new Map<string, TraktHistoryItem>();
  for (const item of traktItems) {
    traktMap.set(buildHistoryKey(item), item);
  }
  const toAdd: TraktHistoryItem[] = [];
  for (const item of watchrItems) {
    const key = buildHistoryKey(item);
    if (!traktMap.has(key)) {
      toAdd.push(item);
    }
    traktMap.delete(key);
  }
  return { toAdd, toRemove: Array.from(traktMap.values()) };
}

function computeRatingDelta(watchrItems: TraktRatingItem[], traktItems: TraktRatingItem[]): { toAdd: TraktRatingItem[]; toRemove: TraktRatingItem[] } {
  const traktMap = new Map<string, TraktRatingItem>();
  for (const item of traktItems) {
    traktMap.set(buildRatingKey(item), item);
  }
  const toAdd: TraktRatingItem[] = [];
  for (const item of watchrItems) {
    const key = buildRatingKey(item);
    const existing = traktMap.get(key);
    if (!existing || existing.rating !== item.rating) {
      toAdd.push(item);
    }
    traktMap.delete(key);
  }
  return { toAdd, toRemove: Array.from(traktMap.values()) };
}

function computeWatchlistDelta(watchrItems: TraktWatchlistItem[], traktItems: TraktWatchlistItem[]): { toAdd: TraktWatchlistItem[]; toRemove: TraktWatchlistItem[] } {
  const traktMap = new Map<string, TraktWatchlistItem>();
  for (const item of traktItems) {
    traktMap.set(buildWatchlistKey(item), item);
  }
  const toAdd: TraktWatchlistItem[] = [];
  for (const item of watchrItems) {
    const key = buildWatchlistKey(item);
    if (!traktMap.has(key)) {
      toAdd.push(item);
    }
    traktMap.delete(key);
  }
  return { toAdd, toRemove: Array.from(traktMap.values()) };
}

export async function syncToTrakt(userId: string): Promise<{ added: number; deleted: number; notFound: number }> {
  const link = await TraktLink.findOne({ userId: new Types.ObjectId(userId) });
  if (!link) {
    throw new ApiError(404, "TRAKT_NOT_LINKED", "Trakt account not linked");
  }

  const accessToken = await getValidAccessToken(link);
  log("TraktService", "starting sync to Trakt", { username: link.traktUsername });

  const [traktHistory, traktRatings, traktWatchlist, watchrEntries] = await Promise.all([
    traktApiGet<TraktHistoryEntry[]>(accessToken, "/sync/history", { limit: "1000" }),
    traktApiGet<TraktRatingEntry[]>(accessToken, "/users/me/ratings", { limit: "1000" }),
    traktApiGet<TraktWatchlistEntry[]>(accessToken, "/sync/watchlist", { limit: "1000" }),
    gatherExportData(userId),
  ]);

  const watchrHistoryItems = watchrEntriesToHistoryItems(watchrEntries);
  const watchrRatingItems = watchrEntriesToRatingItems(watchrEntries);
  const watchrWatchlistItems = watchrEntriesToWatchlistItems(watchrEntries);

  const traktHistoryItems = traktHistory.map(traktHistoryToItem).filter((i): i is TraktHistoryItem => i !== null);
  const traktRatingItems = traktRatings.map(traktRatingToItem).filter((i): i is TraktRatingItem => i !== null);
  const traktWatchlistItems = traktWatchlist.map(traktWatchlistToItem).filter((i): i is TraktWatchlistItem => i !== null);

  const historyDelta = computeHistoryDelta(watchrHistoryItems, traktHistoryItems);
  const ratingDelta = computeRatingDelta(watchrRatingItems, traktRatingItems);
  const watchlistDelta = computeWatchlistDelta(watchrWatchlistItems, traktWatchlistItems);

  const results: TraktSyncDeltaResponse[] = [];

  if (historyDelta.toAdd.length > 0) {
    const payload = buildPayloadFromItems(historyDelta.toAdd);
    log("TraktService", "pushing history add", { count: historyDelta.toAdd.length });
    const res = await traktApiPost<TraktSyncDeltaResponse>(accessToken, "/sync/history", payload);
    log("TraktService", "history add result", res);
    results.push(res);
  }

  if (historyDelta.toRemove.length > 0) {
    const payload = buildPayloadFromItems(historyDelta.toRemove);
    log("TraktService", "pushing history remove", { count: historyDelta.toRemove.length });
    const res = await traktApiDelete<TraktSyncDeltaResponse>(accessToken, "/sync/history", payload);
    log("TraktService", "history remove result", res);
    results.push(res);
  }

  if (ratingDelta.toAdd.length > 0) {
    const payload = buildPayloadFromItems(ratingDelta.toAdd);
    log("TraktService", "pushing ratings add", { count: ratingDelta.toAdd.length });
    const res = await traktApiPost<TraktSyncDeltaResponse>(accessToken, "/sync/ratings", payload);
    log("TraktService", "ratings add result", res);
    results.push(res);
  }

  if (ratingDelta.toRemove.length > 0) {
    const payload = buildPayloadFromItems(ratingDelta.toRemove);
    log("TraktService", "pushing ratings remove", { count: ratingDelta.toRemove.length });
    const res = await traktApiPost<TraktSyncDeltaResponse>(accessToken, "/sync/ratings/remove", payload);
    log("TraktService", "ratings remove result", res);
    results.push(res);
  }

  if (watchlistDelta.toAdd.length > 0) {
    const payload = buildPayloadFromItems(watchlistDelta.toAdd);
    log("TraktService", "pushing watchlist add", { count: watchlistDelta.toAdd.length });
    const res = await traktApiPost<TraktSyncDeltaResponse>(accessToken, "/sync/watchlist", payload);
    log("TraktService", "watchlist add result", res);
    results.push(res);
  }

  if (watchlistDelta.toRemove.length > 0) {
    const payload = buildPayloadFromItems(watchlistDelta.toRemove);
    log("TraktService", "pushing watchlist remove", { count: watchlistDelta.toRemove.length });
    const res = await traktApiDelete<TraktSyncDeltaResponse>(accessToken, "/sync/watchlist", payload);
    log("TraktService", "watchlist remove result", res);
    results.push(res);
  }

  const added = results.reduce(
    (sum, r) => sum + Object.values(r.added ?? {}).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0),
    0,
  );
  const deleted = results.reduce(
    (sum, r) => sum + Object.values(r.deleted ?? {}).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0),
    0,
  );
  const notFound = results.reduce(
    (sum, r) => sum + Object.values(r.not_found ?? {}).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0),
    0,
  );

  link.lastSyncToTraktAt = new Date();
  await link.save();

  log("TraktService", "sync to Trakt completed", { added, deleted, notFound });

  return { added, deleted, notFound };
}

export async function setTraktSyncDirection(userId: string, direction: "from" | "both"): Promise<ITraktLink> {
  const link = await TraktLink.findOne({ userId: new Types.ObjectId(userId) });
  if (!link) {
    throw new ApiError(404, "TRAKT_NOT_LINKED", "Trakt account not linked");
  }
  link.syncDirection = direction;
  await link.save();
  return link;
}

export async function syncAllAutoSyncUsers(): Promise<void> {
  const links = await TraktLink.find({ autoSync: true });
  log("TraktService", "auto-sync batch", { count: links.length });

  for (const link of links) {
    try {
      const userId = link.userId.toString();
      await syncFromTrakt(userId);
      if (link.syncDirection === "both") {
        await syncToTrakt(userId);
      }
    } catch (err) {
      logError("TraktService", "auto-sync failed for user", err as Error, { userId: link.userId.toString() });
    }
  }
}
