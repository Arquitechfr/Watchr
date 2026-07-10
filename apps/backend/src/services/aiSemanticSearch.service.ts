import { mistralService } from "./mistral.service.js";
import { tmdbService } from "./tmdb.service.js";
import type { TmdbSearchResult } from "./tmdb.service.js";
import { log } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { SearchResultItem, toTmdbLanguage } from "./show.service.js";

const CACHE_TTL = 6 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_semantic_search_enabled" }).lean();
  return entry?.value === "true";
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface SemanticSearchResult {
  results: SearchResultItem[];
  source: "ai" | "fallback";
  similarities?: number[];
}

export async function semanticSearchShows(
  query: string,
  locale = "en",
): Promise<SemanticSearchResult> {
  const tmdbLanguage = toTmdbLanguage(locale);

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return fallbackSemanticSearch(query, tmdbLanguage);
  }

  const cacheKey = `ai:semantic:${query}:${locale}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as SemanticSearchResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const queryEmbeddingResult = await mistralService.safeEmbeddings({
    inputs: [query],
  });

  if (!queryEmbeddingResult || queryEmbeddingResult.embeddings.length === 0) {
    log("AISemanticSearch", "embedding unavailable, falling back");
    return fallbackSemanticSearch(query, tmdbLanguage);
  }

  const queryEmbedding = queryEmbeddingResult.embeddings[0];

  const tmdbResults = await tmdbService.searchMulti(query, tmdbLanguage);
  const candidates = tmdbResults.results
    .filter((r: TmdbSearchResult) => r.media_type === "tv" || r.media_type === "movie")
    .slice(0, 20);

  if (candidates.length === 0) {
    return { results: [], source: "fallback" };
  }

  const candidateTexts = candidates.map((c: TmdbSearchResult) => {
    const title = c.name ?? c.title ?? "";
    const overview = c.overview ?? "";
    return `${title}. ${overview}`.slice(0, 500);
  });

  const candidateEmbeddingsResult = await mistralService.safeEmbeddings({
    inputs: candidateTexts,
  });

  if (!candidateEmbeddingsResult || candidateEmbeddingsResult.embeddings.length === 0) {
    log("AISemanticSearch", "candidate embeddings unavailable, using TMDB order");
    const results: SearchResultItem[] = candidates.slice(0, 10).map((c: TmdbSearchResult) => ({
      tmdbId: c.id,
      title: c.name ?? c.title ?? "",
      posterPath: c.poster_path ?? undefined,
      backdropPath: c.backdrop_path ?? undefined,
      overview: c.overview,
      type: c.media_type as "tv" | "movie",
      voteAverage: c.vote_average,
      releaseDate: c.release_date ?? c.first_air_date,
    }));
    return { results, source: "fallback" };
  }

  const scored = candidates.map((candidate: TmdbSearchResult, index: number) => ({
    candidate,
    score: cosineSimilarity(queryEmbedding, candidateEmbeddingsResult.embeddings[index]),
  }));

  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  const topResults = scored.slice(0, 10);
  const results: SearchResultItem[] = topResults.map(({ candidate }: { candidate: TmdbSearchResult }) => ({
    tmdbId: candidate.id,
    title: candidate.name ?? candidate.title ?? "",
    posterPath: candidate.poster_path ?? undefined,
    backdropPath: candidate.backdrop_path ?? undefined,
    overview: candidate.overview,
    type: candidate.media_type as "tv" | "movie",
    voteAverage: candidate.vote_average,
    releaseDate: candidate.release_date ?? candidate.first_air_date,
  }));

  const similarities = topResults.map((s: { score: number }) => s.score);

  const semanticResult: SemanticSearchResult = { results, source: "ai", similarities };
  await setRedisValue(cacheKey, JSON.stringify(semanticResult), CACHE_TTL);

  log("AISemanticSearch", "semantic search completed", {
    query,
    resultCount: results.length,
    topScore: similarities[0],
  });

  return semanticResult;
}

async function fallbackSemanticSearch(
  query: string,
  tmdbLanguage: string,
): Promise<SemanticSearchResult> {
  const tmdbResults = await tmdbService.searchMulti(query, tmdbLanguage);
  const results: SearchResultItem[] = tmdbResults.results
    .filter((r: TmdbSearchResult) => r.media_type === "tv" || r.media_type === "movie")
    .slice(0, 10)
    .map((c: TmdbSearchResult) => ({
      tmdbId: c.id,
      title: c.name ?? c.title ?? "",
      posterPath: c.poster_path ?? undefined,
      backdropPath: c.backdrop_path ?? undefined,
      overview: c.overview,
      type: c.media_type as "tv" | "movie",
      voteAverage: c.vote_average,
      releaseDate: c.release_date ?? c.first_air_date,
    }));

  return { results, source: "fallback" };
}
