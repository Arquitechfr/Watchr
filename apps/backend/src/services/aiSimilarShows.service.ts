import { Types } from "mongoose";
import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import { tmdbService } from "./tmdb.service.js";
import { toTmdbLanguage } from "./show.service.js";
import type { TmdbSearchResult } from "./tmdb.service.js";
import { Show } from "../models/show.model.js";
import { getShowTitle } from "../models/show.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import type { SupportedLocale } from "../i18n/translations.js";

const CACHE_TTL = 24 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_similar_shows_enabled" }).lean();
  return entry?.value === "true";
}

export interface SimilarShow {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface SimilarShowsResult {
  shows: SimilarShow[];
  source: "ai" | "fallback";
}

async function filterFollowedShows(
  shows: SimilarShow[],
  userId: string,
): Promise<SimilarShow[]> {
  const entries = await WatchEntry.find({ userId: new Types.ObjectId(userId) })
    .populate("showId", "tmdbId")
    .lean();
  const followedTmdbIds = new Set<number>();
  for (const entry of entries) {
    const show = entry.showId as unknown as { tmdbId?: number } | null;
    if (show?.tmdbId) {
      followedTmdbIds.add(show.tmdbId);
    }
  }
  return shows.filter((s) => !followedTmdbIds.has(s.tmdbId));
}

export async function getSimilarShows(
  showId: string,
  locale: SupportedLocale = "en",
  userId?: string,
): Promise<SimilarShowsResult> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    const fallback = await getFallbackSimilarShows(showId, locale);
    if (userId) {
      fallback.shows = await filterFollowedShows(fallback.shows, userId);
    }
    return fallback;
  }

  const cacheKey = `ai:similar:${showId}:${locale}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      const cachedResult = JSON.parse(cached) as SimilarShowsResult;
      if (userId) {
        cachedResult.shows = await filterFollowedShows(cachedResult.shows, userId);
      }
      return cachedResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const show = await Show.findById(showId).lean();
  if (!show) {
    return { shows: [], source: "fallback" };
  }

  const showTitle = getShowTitle(show, locale);
  const showType = show.type;
  const showGenres = show.genres ?? [];
  const showOverview = show.translations?.[locale]?.overview ?? show.translations?.en?.overview ?? "";

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are a "similar shows" recommendation engine for "Watchr", a TV show and movie tracking app. Based on the given show, suggest 15 similar shows/movies that a fan of the original would enjoy.

Rules:
- Respond in ${languageName}
- Return ONLY a JSON array of objects with: tmdb_title (string), type ("tv" or "movie"), reason (short explanation in ${languageName}, max 100 chars)
- Do NOT suggest the same show
- Focus on shows with similar themes, genre, or tone
- Mix well-known and lesser-known titles`;

  const userContent = `Show: ${showTitle}
Type: ${showType}
Genres: ${showGenres.join(", ") || "Unknown"}
Overview: ${showOverview.slice(0, 500)}`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.7,
    responseFormat: { type: "json_object" },
    maxTokens: 1500,
    feature: "similar_shows",
  });

  if (!result) {
    log("AISimilarShows", "AI unavailable, using fallback");
    const fallback = await getFallbackSimilarShows(showId, locale);
    if (userId) {
      fallback.shows = await filterFollowedShows(fallback.shows, userId);
    }
    return fallback;
  }

  try {
    const parsed = JSON.parse(result.content);
    const items: Array<{ tmdb_title: string; type: "tv" | "movie"; reason: string }> = Array.isArray(parsed)
      ? parsed
      : parsed.shows ?? parsed.recommendations ?? parsed.data ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      const fallback = await getFallbackSimilarShows(showId, locale);
      if (userId) {
        fallback.shows = await filterFollowedShows(fallback.shows, userId);
      }
      return fallback;
    }

    const tmdbLanguage = toTmdbLanguage(locale);

    const shows: SimilarShow[] = [];

    for (const item of items.slice(0, 15)) {
      try {
        const searchResult = await tmdbService.searchMulti(item.tmdb_title, tmdbLanguage);
        const match = searchResult.results.find(
          (r: TmdbSearchResult) => (r.media_type === "tv" || r.media_type === "movie") && r.media_type === item.type,
        );
        if (match) {
          shows.push({
            tmdbId: match.id,
            type: match.media_type as "tv" | "movie",
            title: match.name ?? match.title ?? item.tmdb_title,
            posterPath: match.poster_path ?? undefined,
            overview: match.overview,
            reason: item.reason,
          });
        }
      } catch {
        // Skip if TMDB search fails
      }
    }

    if (shows.length === 0) {
      const fallback = await getFallbackSimilarShows(showId, locale);
      if (userId) {
        fallback.shows = await filterFollowedShows(fallback.shows, userId);
      }
      return fallback;
    }

    const similarResult: SimilarShowsResult = { shows, source: "ai" };
    await setRedisValue(cacheKey, JSON.stringify(similarResult), CACHE_TTL);
    log("AISimilarShows", "similar shows generated", { showId, count: shows.length });
    if (userId) {
      similarResult.shows = await filterFollowedShows(similarResult.shows, userId);
    }
    return similarResult;
  } catch (err) {
    logError("AISimilarShows", "parse error", err, { content: result.content.slice(0, 200) });
    const fallback = await getFallbackSimilarShows(showId, locale);
    if (userId) {
      fallback.shows = await filterFollowedShows(fallback.shows, userId);
    }
    return fallback;
  }
}

async function getFallbackSimilarShows(
  showId: string,
  locale: SupportedLocale,
): Promise<SimilarShowsResult> {
  try {
    const show = await Show.findById(showId).lean();
    if (!show || !show.tmdbId) {
      return { shows: [], source: "fallback" };
    }

    const tmdbLanguage = toTmdbLanguage(locale);

    const results = await tmdbService.getSimilar(show.tmdbId, show.type, tmdbLanguage);
    const topResults = results.slice(0, 15);

    const shows: SimilarShow[] = topResults.map((item: TmdbSearchResult) => ({
      tmdbId: item.id,
      type: show.type,
      title: item.name ?? item.title ?? "Unknown",
      posterPath: item.poster_path ?? undefined,
      overview: item.overview,
      reason: "Similar",
    }));

    return { shows, source: "fallback" };
  } catch (err) {
    logError("AISimilarShows", "fallback failed", err);
    return { shows: [], source: "fallback" };
  }
}
