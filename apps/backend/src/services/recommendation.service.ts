import { Types } from "mongoose";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Rating } from "../models/rating.model.js";
import { Favorite } from "../models/favorite.model.js";
import { mistralService } from "./mistral.service.js";
import { tmdbService } from "./tmdb.service.js";
import { toTmdbLanguage } from "./show.service.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getTranslationValue } from "../models/show.model.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import { translateRecommendation } from "../i18n/index.js";
import { type TmdbSearchResult } from "./tmdb.service.js";

interface PopulatedShow {
  _id: { toString(): string };
  title?: string;
  type?: string;
  genres?: { name: string }[];
  translations?: unknown;
}

export interface RecommendationItem {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface RecommendationResult {
  recommendations: RecommendationItem[];
  source: "ai" | "fallback";
}

const CACHE_TTL = 3600;
const MAX_HISTORY_SHOWS = 20;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_recommendations_enabled" }).lean();
  return entry?.value === "true";
}

export async function getRecommendations(userId: string, language = "en"): Promise<RecommendationResult> {
  const cacheKey = `ai:recs:${userId}:${language}`;
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return getFallbackRecommendations(language);
  }

  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as RecommendationResult;
      if (parsed.source === "ai") {
        return parsed;
      }
    } catch {
      // Cache corrupt, proceed
    }
  }

  const [watchEntries, ratings, favorites] = await Promise.all([
    WatchEntry.find({ userId: new Types.ObjectId(userId) })
      .populate("showId", "tmdbId title type genres translations overview")
      .lean(),
    Rating.find({ userId: new Types.ObjectId(userId) })
      .populate("showId", "tmdbId title type genres translations")
      .lean(),
    Favorite.find({ userId: new Types.ObjectId(userId) })
      .populate("showId", "tmdbId title type genres translations")
      .lean(),
  ]);

  const showMap = new Map<string, { title: string; type: string; genres: string[]; rating?: number; status?: string }>();

  for (const entry of watchEntries) {
    const show = entry.showId as unknown as PopulatedShow;
    if (!show?._id) continue;
    const id = show._id.toString();
    const translation = getTranslationValue(show.translations, language);
    showMap.set(id, {
      title: translation?.title ?? show.title ?? "Unknown",
      type: show.type ?? "tv",
      genres: (show.genres ?? []).map((g: { name: string }) => g.name).filter(Boolean),
      status: entry.status,
    });
  }

  for (const rating of ratings) {
    const show = rating.showId as unknown as PopulatedShow;
    if (!show?._id) continue;
    const id = show._id.toString();
    const existing = showMap.get(id);
    if (existing) {
      existing.rating = rating.value;
    } else {
      const translation = getTranslationValue(show.translations, language);
      showMap.set(id, {
        title: translation?.title ?? show.title ?? "Unknown",
        type: show.type ?? "tv",
        genres: (show.genres ?? []).map((g: { name: string }) => g.name).filter(Boolean),
        rating: rating.value,
      });
    }
  }

  for (const fav of favorites) {
    const show = fav.showId as unknown as PopulatedShow;
    if (!show?._id) continue;
    const id = show._id.toString();
    if (!showMap.has(id)) {
      const translation = getTranslationValue(show.translations, language);
      showMap.set(id, {
        title: translation?.title ?? show.title ?? "Unknown",
        type: show.type ?? "tv",
        genres: (show.genres ?? []).map((g: { name: string }) => g.name).filter(Boolean),
      });
    }
  }

  if (showMap.size === 0) {
    return getFallbackRecommendations(language);
  }

  const historyItems = Array.from(showMap.values())
    .slice(0, MAX_HISTORY_SHOWS)
    .map((s) => `- ${s.title} (${s.type})${s.genres.length ? ` [genres: ${s.genres.join(", ")}]` : ""}${s.rating ? ` [rating: ${s.rating}/5]` : ""}${s.status ? ` [status: ${s.status}]` : ""}`)
    .join("\n");

  const languageName = languageNameForLocale(language);

  const systemPrompt = `You are a TV show and movie recommendation engine for "Watchr", a tracking app. Based on the user's watch history, ratings, and favorites, suggest 10 shows/movies they would enjoy but haven't seen yet.

Rules:
- Return ONLY a JSON array of objects with: tmdb_title (string), type ("tv" or "movie"), reason (short personalized explanation in ${languageName})
- Do NOT recommend shows the user has already watched
- Mix popular and lesser-known recommendations
- Keep reasons under 100 characters
- Respond in ${languageName}`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is my watch history:\n${historyItems}` },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.7,
    responseFormat: { type: "json_object" },
    maxTokens: 1500,
    feature: "recommendations",
  });

  if (!result) {
    log("RecommendationService", "AI unavailable, returning fallback");
    return getFallbackRecommendations(language);
  }

  try {
    const parsed = JSON.parse(result.content);
    const items: Array<{ tmdb_title: string; type: "tv" | "movie"; reason: string }> = parsed.recommendations ?? parsed;

    const recommendations: RecommendationItem[] = [];
    const tmdbLanguage = toTmdbLanguage(language);
    for (const item of items.slice(0, 10)) {
      try {
        const tmdbResults = item.type === "tv"
          ? await tmdbService.searchShows(item.tmdb_title, tmdbLanguage)
          : await tmdbService.searchMovies(item.tmdb_title, tmdbLanguage);

        const match = tmdbResults[0];
        if (!match) continue;

        recommendations.push({
          tmdbId: match.id,
          type: item.type,
          title: match.name ?? match.title ?? item.tmdb_title,
          posterPath: match.poster_path ?? undefined,
          overview: match.overview,
          reason: item.reason,
        });
      } catch (err) {
        logError("RecommendationService", "TMDB lookup failed for recommendation", err, { title: item.tmdb_title });
      }
    }

    if (recommendations.length === 0) {
      return getFallbackRecommendations(language);
    }

    const response: RecommendationResult = { recommendations, source: "ai" };
    await setRedisValue(cacheKey, JSON.stringify(response), CACHE_TTL);
    log("RecommendationService", "generated", { count: recommendations.length, userId });
    return response;
  } catch (err) {
    logError("RecommendationService", "parse error", err, { content: result.content.slice(0, 200) });
    return getFallbackRecommendations(language);
  }
}

async function getFallbackRecommendations(language = "en"): Promise<RecommendationResult> {
  try {
    const tmdbLanguage = toTmdbLanguage(language);
    const [trendingTv, trendingMovies] = await Promise.all([
      tmdbService.getTrendingTv(10, tmdbLanguage).catch(() => ({ results: [] as TmdbSearchResult[] })),
      tmdbService.getTrendingMovies(10, tmdbLanguage).catch(() => ({ results: [] as TmdbSearchResult[] })),
    ]);

    const all = [...trendingTv.results, ...trendingMovies.results].slice(0, 10);
    const recommendations: RecommendationItem[] = all.map((item) => ({
      tmdbId: item.id,
      type: item.media_type === "movie" ? "movie" : "tv",
      title: item.name ?? item.title ?? "Unknown",
      posterPath: item.poster_path ?? undefined,
      overview: item.overview,
      reason: translateRecommendation("fallbackReason", language),
    }));

    return { recommendations, source: "fallback" };
  } catch (err) {
    logError("RecommendationService", "fallback failed", err);
    return { recommendations: [], source: "fallback" };
  }
}
