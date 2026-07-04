import axios from "axios";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { TraktLink, ITraktLink } from "../models/traktLink.model.js";
import { ImportJob } from "../models/importJob.model.js";
import { getImportQueue } from "../workers/import.worker.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";
import { ParsedRecord } from "./import/types.js";
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
  watched_at: string;
  type: string;
  episode?: { season: number; number: number; title?: string; ids: { trakt?: number; tmdb?: number; imdb?: string } };
  show?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
  movie?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
}

interface TraktRatingEntry {
  rated_at: string;
  rating: number;
  type: string;
  show?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
  movie?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number; imdb?: string } };
}

interface TraktWatchlistEntry {
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

export async function syncAllAutoSyncUsers(): Promise<void> {
  const links = await TraktLink.find({ autoSync: true });
  log("TraktService", "auto-sync batch", { count: links.length });

  for (const link of links) {
    try {
      const userId = link.userId.toString();
      await syncFromTrakt(userId);
    } catch (err) {
      logError("TraktService", "auto-sync failed for user", err as Error, { userId: link.userId.toString() });
    }
  }
}
