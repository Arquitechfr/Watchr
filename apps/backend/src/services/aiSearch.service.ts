import { mistralService } from "./mistral.service.js";
import { tmdbService } from "./tmdb.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { SearchResultItem, toTmdbLanguage } from "./show.service.js";
import { type TmdbSearchResult } from "./tmdb.service.js";

export interface AISearchResult {
  results: SearchResultItem[];
  source: "ai" | "fallback";
  parsedQuery?: {
    keywords: string[];
    genres: string[];
    yearRange?: [number, number];
  };
}

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_search_enabled" }).lean();
  return entry?.value === "true";
}

export async function aiSearchShows(query: string, locale = "en"): Promise<AISearchResult> {
  const tmdbLanguage = toTmdbLanguage(locale);

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return fallbackSearch(query, tmdbLanguage);
  }

  const systemPrompt = `You are a search assistant for a TV show/movie tracking app. The user gives a natural language query. Extract structured search parameters.

Respond in JSON format only:
{
  "keywords": [main search terms for TMDB search],
  "genres": [genre names if identifiable, e.g. "sci-fi", "comedy", "thriller"],
  "year_range": [start_year, end_year] or null
}

Examples:
- "psychological thriller with time travel" → {"keywords": ["psychological thriller time travel"], "genres": ["thriller"], "year_range": null}
- "funny 90s sitcom" → {"keywords": ["sitcom comedy"], "genres": ["comedy"], "year_range": [1990, 1999]}
- "recent sci-fi movie about space" → {"keywords": ["sci-fi space"], "genres": ["sci-fi"], "year_range": [2020, 2025]}`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.1,
    responseFormat: { type: "json_object" },
    maxTokens: 200,
    feature: "ai_search",
  });

  if (!result) {
    log("AISearch", "AI unavailable, falling back to standard search");
    return fallbackSearch(query, tmdbLanguage);
  }

  try {
    const parsed = JSON.parse(result.content);
    const keywords = (parsed.keywords ?? []).join(" ") || query;
    const genres: string[] = parsed.genres ?? [];
    const yearRange: [number, number] | undefined = Array.isArray(parsed.year_range) && parsed.year_range.length === 2
      ? [Number(parsed.year_range[0]), Number(parsed.year_range[1])]
      : undefined;

    const [tvResults, movieResults] = await Promise.all([
      tmdbService.searchShows(keywords, tmdbLanguage).catch((err: Error) => {
        logError("AISearch", "TMDB TV search failed", err);
        return [];
      }),
      tmdbService.searchMovies(keywords, tmdbLanguage).catch((err: Error) => {
        logError("AISearch", "TMDB movie search failed", err);
        return [];
      }),
    ]);

    const allResults = [...tvResults, ...movieResults];

    let filtered = allResults;
    if (yearRange) {
      filtered = filtered.filter((item) => {
        const dateStr = item.first_air_date ?? item.release_date;
        if (!dateStr) return true;
        const year = new Date(dateStr).getFullYear();
        return year >= yearRange[0] && year <= yearRange[1];
      });
    }

    const results: SearchResultItem[] = filtered.slice(0, 20).map((item) => ({
      tmdbId: item.id,
      type: item.name ? "tv" : "movie",
      title: item.name ?? item.title ?? "Unknown",
      posterPath: item.poster_path ?? undefined,
      overview: item.overview,
      firstAirDate: item.first_air_date ?? item.release_date,
      source: "tmdb" as const,
    }));

    return {
      results,
      source: "ai",
      parsedQuery: { keywords, genres, yearRange },
    };
  } catch (err) {
    logError("AISearch", "parse error", err, { content: result.content.slice(0, 200) });
    return fallbackSearch(query, tmdbLanguage);
  }
}

async function fallbackSearch(query: string, tmdbLanguage: string): Promise<AISearchResult> {
  const [tvResults, movieResults] = await Promise.all([
    tmdbService.searchShows(query, tmdbLanguage).catch(() => [] as TmdbSearchResult[]),
    tmdbService.searchMovies(query, tmdbLanguage).catch(() => [] as TmdbSearchResult[]),
  ]);

  const results: SearchResultItem[] = [
    ...tvResults.map((item: TmdbSearchResult) => ({
      tmdbId: item.id,
      type: "tv" as const,
      title: item.name ?? item.title ?? "Unknown",
      posterPath: item.poster_path ?? undefined,
      overview: item.overview,
      firstAirDate: item.first_air_date,
      source: "tmdb" as const,
    })),
    ...movieResults.map((item: TmdbSearchResult) => ({
      tmdbId: item.id,
      type: "movie" as const,
      title: item.name ?? item.title ?? "Unknown",
      posterPath: item.poster_path ?? undefined,
      overview: item.overview,
      firstAirDate: item.release_date,
      source: "tmdb" as const,
    })),
  ];

  return { results, source: "fallback" };
}
