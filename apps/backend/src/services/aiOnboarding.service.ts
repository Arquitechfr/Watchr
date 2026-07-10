import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import { tmdbService } from "./tmdb.service.js";
import type { TmdbSearchResult } from "./tmdb.service.js";
import type { SupportedLocale } from "../i18n/translations.js";

const CACHE_TTL = 6 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_onboarding_enabled" }).lean();
  return entry?.value === "true";
}

export interface OnboardingSuggestion {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface OnboardingSuggestionResult {
  suggestions: OnboardingSuggestion[];
  source: "ai" | "fallback";
}

export async function getOnboardingSuggestions(
  preferences: {
    genres?: string[];
    mood?: string;
    type?: "tv" | "movie" | "both";
  },
  locale: SupportedLocale = "en",
): Promise<OnboardingSuggestionResult> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return getFallbackOnboardingSuggestions(preferences, locale);
  }

  const cacheKey = `ai:onboarding:${JSON.stringify(preferences)}:${locale}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as OnboardingSuggestionResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are an onboarding assistant for "Watchr", a TV show and movie tracking app. Based on the user's genre preferences and mood, suggest 15 shows/movies they would enjoy starting with.

Rules:
- Respond in ${languageName}
- Return ONLY a JSON array of objects with: tmdb_title (string), type ("tv" or "movie"), reason (short personalized explanation in ${languageName}, max 80 chars)
- Focus on popular, well-known titles that are easy to find
- Mix TV shows and movies unless the user specified a type
- Keep reasons concise and encouraging for a new user`;

  const userContent = `Preferences:
- Genres: ${preferences.genres?.join(", ") ?? "Any"}
- Mood: ${preferences.mood ?? "Any"}
- Type preference: ${preferences.type ?? "both"}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.8,
    responseFormat: { type: "json_object" },
    maxTokens: 2000,
    feature: "onboarding",
  });

  if (!result) {
    log("AIOnboarding", "AI unavailable, using fallback");
    return getFallbackOnboardingSuggestions(preferences, locale);
  }

  try {
    const parsed = JSON.parse(result.content);
    const items: Array<{ tmdb_title: string; type: "tv" | "movie"; reason: string }> = Array.isArray(parsed)
      ? parsed
      : parsed.suggestions ?? parsed.data ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return getFallbackOnboardingSuggestions(preferences, locale);
    }

    const tmdbLanguageMap: Record<string, string> = {
      en: "en-US", fr: "fr-FR", es: "es-ES", pt: "pt-BR", de: "de-DE", it: "it-IT", ar: "ar-SA",
    };
    const tmdbLanguage = tmdbLanguageMap[locale] ?? "en-US";

    const suggestions: OnboardingSuggestion[] = [];

    for (const item of items.slice(0, 15)) {
      try {
        const searchResult = await tmdbService.searchMulti(item.tmdb_title, tmdbLanguage);
        const match = searchResult.results.find(
          (r: TmdbSearchResult) => (r.media_type === "tv" || r.media_type === "movie") && r.media_type === item.type,
        );
        if (match) {
          suggestions.push({
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

    if (suggestions.length === 0) {
      return getFallbackOnboardingSuggestions(preferences, locale);
    }

    const onboardingResult: OnboardingSuggestionResult = { suggestions, source: "ai" };
    await setRedisValue(cacheKey, JSON.stringify(onboardingResult), CACHE_TTL);
    log("AIOnboarding", "suggestions generated", { count: suggestions.length });
    return onboardingResult;
  } catch (err) {
    logError("AIOnboarding", "parse error", err, { content: result.content.slice(0, 200) });
    return getFallbackOnboardingSuggestions(preferences, locale);
  }
}

async function getFallbackOnboardingSuggestions(
  preferences: { genres?: string[]; mood?: string; type?: string },
  locale: SupportedLocale,
): Promise<OnboardingSuggestionResult> {
  try {
    const tmdbLanguageMap: Record<string, string> = {
      en: "en-US", fr: "fr-FR", es: "es-ES", pt: "pt-BR", de: "de-DE", it: "it-IT", ar: "ar-SA",
    };
    const tmdbLanguage = tmdbLanguageMap[locale] ?? "en-US";

    const genre = preferences.genres?.[0] ?? "popular";
    const [tvResults, movieResults] = await Promise.all([
      tmdbService.searchShows(genre, tmdbLanguage).catch(() => [] as TmdbSearchResult[]),
      tmdbService.searchMovies(genre, tmdbLanguage).catch(() => [] as TmdbSearchResult[]),
    ]);

    const all = [...tvResults.slice(0, 8), ...movieResults.slice(0, 7)];

    const suggestions: OnboardingSuggestion[] = all.map((item) => ({
      tmdbId: item.id,
      type: item.title ? "movie" : "tv",
      title: item.name ?? item.title ?? "Unknown",
      posterPath: item.poster_path ?? undefined,
      overview: item.overview,
      reason: "Popular pick",
    }));

    return { suggestions, source: "fallback" };
  } catch (err) {
    logError("AIOnboarding", "fallback failed", err);
    return { suggestions: [], source: "fallback" };
  }
}
