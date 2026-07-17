import { distance } from "fastest-levenshtein";
import pLimit from "p-limit";
import { tmdbService, TmdbSearchResult } from "../../tmdb.service.js";
import { getRedisValue, setRedisValue } from "../../../lib/redis.js";
import { log, logError } from "../../../lib/logger.js";
import type { TmdbMatchResult, TmdbMatchCandidate } from "./types.js";

const CONFIDENCE_THRESHOLD_TV = 0.75;
const CONFIDENCE_THRESHOLD_MOVIE = 0.7;
const MAX_CANDIDATES = 3;
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const CONCURRENCY = 5;

/** Aggressive normalization: lowercase, strip accents, remove parenthetical suffixes, articles, punctuation */
function normalizeStr(s: string): string {
  let out = s.toLowerCase().trim();
  // Remove parenthetical suffixes like (US), (UK), (2005)
  out = out.replace(/\s*\([^)]*\)\s*/g, " ");
  // Remove leading articles
  out = out.replace(/^(the|a|an)\s+/i, "");
  // Normalize accented characters
  out = out.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Remove punctuation and special chars (keep alphanumerics and spaces)
  out = out.replace(/[^a-z0-9\s]/g, " ");
  // Collapse multiple spaces
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function titleSimilarity(searchTitle: string, candidateTitle: string): number {
  const a = normalizeStr(searchTitle);
  const b = normalizeStr(candidateTitle);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return 1 - distance(a, b) / maxLen;
}

function yearMatchScore(sourceYear: number | null, tmdbYear: number | null): number {
  if (sourceYear === null && tmdbYear === null) return 0.5;
  if (sourceYear === null || tmdbYear === null) return 0.25;
  return Math.abs(tmdbYear - sourceYear) <= 1 ? 1 : 0;
}

function extractYearFromResult(result: TmdbSearchResult): number | null {
  const dateStr = result.first_air_date ?? result.release_date;
  if (!dateStr) return null;
  const year = Number(dateStr.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

function scoreCandidate(
  searchTitle: string,
  searchYear: number | null,
  result: TmdbSearchResult,
  threshold: number,
): TmdbMatchCandidate {
  const tmdbTitle = result.name ?? result.title ?? "";
  const tmdbYear = extractYearFromResult(result);

  const titleScore = titleSimilarity(searchTitle, tmdbTitle);
  const yearScore = yearMatchScore(searchYear, tmdbYear);
  let confidenceScore = 0.7 * titleScore + 0.3 * yearScore;

  // Boost exact normalized title matches above threshold even without year
  if (titleScore === 1) {
    confidenceScore = Math.max(confidenceScore, threshold + 0.1);
  }

  return {
    tmdbId: result.id,
    title: tmdbTitle,
    year: tmdbYear,
    posterPath: result.poster_path ?? null,
    confidenceScore,
  };
}

function cacheKey(title: string, year: number | null, mediaType: "tv" | "movie"): string {
  return `tmdb:match:${mediaType}:${title}:${year ?? "null"}`;
}

async function searchWithCache(
  title: string,
  year: number | null,
  mediaType: "tv" | "movie",
): Promise<TmdbSearchResult[]> {
  const key = cacheKey(title, year, mediaType);
  const cached = await getRedisValue(key);
  if (cached) {
    try {
      return JSON.parse(cached) as TmdbSearchResult[];
    } catch {
      // Corrupt cache — continue with live search
    }
  }

  const results =
    mediaType === "tv"
      ? await tmdbService.searchShows(title)
      : await tmdbService.searchMovies(title);

  await setRedisValue(key, JSON.stringify(results), CACHE_TTL_SECONDS);
  return results;
}

async function matchSingle(
  sourceTitle: string,
  sourceYear: number | null,
  tvtimeInternalId: string,
  mediaType: "tv" | "movie",
): Promise<TmdbMatchResult> {
  const threshold = mediaType === "tv" ? CONFIDENCE_THRESHOLD_TV : CONFIDENCE_THRESHOLD_MOVIE;
  try {
    // First search with original title
    const results = await searchWithCache(sourceTitle, sourceYear, mediaType);
    let candidates = results
      .map((r) => scoreCandidate(sourceTitle, sourceYear, r, threshold))
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, MAX_CANDIDATES);

    let bestMatch = candidates[0] ?? null;
    let matched = bestMatch !== null && bestMatch.confidenceScore >= threshold;

    // If not matched and the normalized title differs from the original, retry with normalized title
    if (!matched) {
      const normalized = normalizeStr(sourceTitle);
      if (normalized && normalized !== normalizeStr(sourceTitle) && normalized !== sourceTitle.toLowerCase().trim()) {
        const retryResults = await searchWithCache(normalized, sourceYear, mediaType);
        const retryCandidates = retryResults
          .map((r) => scoreCandidate(sourceTitle, sourceYear, r, threshold))
          .sort((a, b) => b.confidenceScore - a.confidenceScore)
          .slice(0, MAX_CANDIDATES);

        // Merge candidates, dedup by tmdbId, keep best scores
        const seen = new Set(candidates.map((c) => c.tmdbId));
        for (const c of retryCandidates) {
          if (!seen.has(c.tmdbId)) {
            candidates.push(c);
            seen.add(c.tmdbId);
          }
        }
        candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
        candidates = candidates.slice(0, MAX_CANDIDATES);

        bestMatch = candidates[0] ?? null;
        matched = bestMatch !== null && bestMatch.confidenceScore >= threshold;
      }
    }

    return {
      sourceTitle,
      sourceYear,
      tvtimeInternalId,
      mediaType,
      matched,
      bestMatch: matched ? bestMatch : null,
      candidates,
    };
  } catch (err) {
    logError("TvTimeImport", "matchSingle error", err, { sourceTitle });
    return {
      sourceTitle,
      sourceYear,
      tvtimeInternalId,
      mediaType,
      matched: false,
      bestMatch: null,
      candidates: [],
    };
  }
}

export async function matchToTmdb(
  entries: { title: string; year: number | null; tvtimeInternalId: string }[],
  mediaType: "tv" | "movie",
): Promise<TmdbMatchResult[]> {
  const limit = pLimit(CONCURRENCY);
  const tasks = entries.map((entry) =>
    limit(() => matchSingle(entry.title, entry.year, entry.tvtimeInternalId, mediaType)),
  );
  const results = await Promise.all(tasks);

  log("TvTimeImport", "matchToTmdb", {
    mediaType,
    total: results.length,
    matched: results.filter((r) => r.matched).length,
    pending: results.filter((r) => !r.matched).length,
  });

  return results;
}

export { CONFIDENCE_THRESHOLD_TV, CONFIDENCE_THRESHOLD_MOVIE };
