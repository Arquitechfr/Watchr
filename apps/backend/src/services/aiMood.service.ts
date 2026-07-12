import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import { tmdbService } from "./tmdb.service.js";
import { toTmdbLanguage } from "./show.service.js";
import type { TmdbSearchResult } from "./tmdb.service.js";
import type { SupportedLocale } from "../i18n/translations.js";

const CACHE_TTL = 6 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_mood_recommendations_enabled" }).lean();
  return entry?.value === "true";
}

export interface MoodRecommendation {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface MoodRecommendationResult {
  recommendations: MoodRecommendation[];
  source: "ai" | "fallback";
}

const MOOD_KEYWORDS: Record<string, string[]> = {
  happy: ["comedy", "feel-good", "uplifting"],
  sad: ["drama", "emotional", "touching"],
  excited: ["action", "thriller", "adventure"],
  relaxed: ["slice of life", "calm", "cozy"],
  bored: ["mystery", "suspense", "engaging"],
  romantic: ["romance", "love", "romantic"],
};

export async function getMoodRecommendations(
  mood: string,
  locale: SupportedLocale = "en",
): Promise<MoodRecommendationResult> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return getFallbackMoodRecommendations(mood, locale);
  }

  const cacheKey = `ai:mood-rec:${mood}:${locale}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as MoodRecommendationResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are a mood-based recommendation engine for "Watchr", a TV show and movie tracking app. Based on the user's mood, suggest 10 shows/movies that fit that mood.

Rules:
- Respond in ${languageName}
- Return ONLY a JSON array of objects with: tmdb_title (string), type ("tv" or "movie"), reason (short explanation in ${languageName}, max 100 chars)
- Mix well-known and lesser-known titles
- Focus on titles that match the mood
- Keep reasons concise and mood-focused`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `My mood: ${mood}` },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.8,
    responseFormat: { type: "json_object" },
    maxTokens: 1500,
    feature: "mood_recommendations",
  });

  if (!result) {
    log("AIMoodRec", "AI unavailable, using fallback");
    return getFallbackMoodRecommendations(mood, locale);
  }

  try {
    const parsed = JSON.parse(result.content);
    const items: Array<{ tmdb_title: string; type: "tv" | "movie"; reason: string }> = Array.isArray(parsed)
      ? parsed
      : parsed.recommendations ?? parsed.data ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return getFallbackMoodRecommendations(mood, locale);
    }

    const tmdbLanguage = toTmdbLanguage(locale);

    const recommendations: MoodRecommendation[] = [];

    for (const item of items.slice(0, 10)) {
      try {
        const searchResult = await tmdbService.searchMulti(item.tmdb_title, tmdbLanguage);
        const match = searchResult.results.find(
          (r: TmdbSearchResult) => (r.media_type === "tv" || r.media_type === "movie") && r.media_type === item.type,
        );
        if (match) {
          recommendations.push({
            tmdbId: match.id,
            type: match.media_type as "tv" | "movie",
            title: match.name ?? match.title ?? item.tmdb_title,
            posterPath: match.poster_path ?? undefined,
            overview: match.overview,
            reason: item.reason,
          });
        }
      } catch {
        // Skip if TMDB search fails for this item
      }
    }

    if (recommendations.length === 0) {
      return getFallbackMoodRecommendations(mood, locale);
    }

    const moodResult: MoodRecommendationResult = { recommendations, source: "ai" };
    await setRedisValue(cacheKey, JSON.stringify(moodResult), CACHE_TTL);
    log("AIMoodRec", "recommendations generated", { mood, count: recommendations.length });
    return moodResult;
  } catch (err) {
    logError("AIMoodRec", "parse error", err, { content: result.content.slice(0, 200) });
    return getFallbackMoodRecommendations(mood, locale);
  }
}

async function getFallbackMoodRecommendations(
  mood: string,
  locale: SupportedLocale,
): Promise<MoodRecommendationResult> {
  try {
    const tmdbLanguage = toTmdbLanguage(locale);

    const keywords = MOOD_KEYWORDS[mood.toLowerCase()] ?? MOOD_KEYWORDS.happy;
    const query = keywords[0];

    const [tvResults, movieResults] = await Promise.all([
      tmdbService.searchShows(query, tmdbLanguage).catch(() => [] as TmdbSearchResult[]),
      tmdbService.searchMovies(query, tmdbLanguage).catch(() => [] as TmdbSearchResult[]),
    ]);

    const all = [...tvResults.slice(0, 5), ...movieResults.slice(0, 5)];

    const recommendations: MoodRecommendation[] = all.map((item) => ({
      tmdbId: item.id,
      type: item.title ? "movie" : "tv",
      title: item.name ?? item.title ?? "Unknown",
      posterPath: item.poster_path ?? undefined,
      overview: item.overview,
      reason: mood,
    }));

    return { recommendations, source: "fallback" };
  } catch (err) {
    logError("AIMoodRec", "fallback failed", err);
    return { recommendations: [], source: "fallback" };
  }
}
