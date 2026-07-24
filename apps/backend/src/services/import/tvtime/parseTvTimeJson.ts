import AdmZip from "adm-zip";
import * as fs from "fs";
import { log, logError } from "../../../lib/logger.js";
import type {
  ParsedTvTimeExport,
  TvTimeStats,
  TvTimeSeriesEntry,
  TvTimeEpisodeEntry,
  TvTimeMovieEntry,
} from "./types.js";
import { extractTitleAndYear } from "./parseTvTimeExport.js";

interface TvTimeJsonEpisode {
  series_id?: string;
  series_name?: string;
  season_number?: number;
  episode_number?: number;
  watched_at?: string;
  is_special?: boolean;
}

interface TvTimeJsonMovie {
  movie_id?: string;
  movie_name?: string;
  watched_at?: string;
  rating?: number;
}

interface TvTimeJsonSeries {
  series_id?: string;
  series_name?: string;
  is_followed?: boolean;
  is_archived?: boolean;
  is_for_later?: boolean;
  followed_at?: string;
  rating?: number;
}

/**
 * Detect whether a ZIP contains the new JSON format (tvtime-series-episodes/, tvtime-movies/, etc.)
 */
export function isTvTimeJsonZip(filePath: string): boolean {
  if (!filePath.endsWith(".zip")) return false;
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    return entries.some(
      (e) =>
        e.entryName.includes("tvtime-series-episodes") ||
        e.entryName.includes("tvtime-movies") ||
        e.entryName.includes("tvtime-series/"),
    );
  } catch {
    return false;
  }
}

/**
 * Check if a single file is a TV Time JSON export
 */
export function isTvTimeJsonFile(filePath: string): boolean {
  if (!filePath.endsWith(".json")) return false;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    return (
      Array.isArray(data) ||
      (data && typeof data === "object" && ("series_id" in data || "movie_id" in data || "series_name" in data))
    );
  } catch {
    return false;
  }
}

/**
 * Parse a JSON file or ZIP containing the new TV Time GDPR export format.
 * Expected structure in ZIP:
 *   tvtime-series-episodes/*.json — array of watched episodes
 *   tvtime-movies/*.json — array of watched movies
 *   tvtime-series/*.json — array of followed series
 */
export function parseTvTimeJsonZip(filePath: string): ParsedTvTimeExport {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  const series: TvTimeSeriesEntry[] = [];
  const episodes: TvTimeEpisodeEntry[] = [];
  const movies: TvTimeMovieEntry[] = [];
  let skippedRows = 0;

  for (const entry of entries) {
    if (!entry.entryName.endsWith(".json")) continue;

    try {
      const content = entry.getData().toString("utf8");
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];

      if (entry.entryName.includes("tvtime-series-episodes")) {
        for (const item of items) {
          const ep = item as TvTimeJsonEpisode;
          if (!ep.series_name) {
            skippedRows++;
            continue;
          }
          const { title, year } = extractTitleAndYear(ep.series_name);
          episodes.push({
            sId: ep.series_id ?? "",
            seriesNameRaw: ep.series_name,
            title,
            year,
            seasonNumber: ep.season_number ?? 0,
            episodeNumber: ep.episode_number ?? 0,
            epId: "",
            isSpecial: ep.is_special ?? false,
            isRewatch: false,
            createdAt: ep.watched_at ? new Date(ep.watched_at) : new Date(),
          });
        }
      } else if (entry.entryName.includes("tvtime-movies")) {
        for (const item of items) {
          const movie = item as TvTimeJsonMovie;
          if (!movie.movie_name) {
            skippedRows++;
            continue;
          }
          const { title, year } = extractTitleAndYear(movie.movie_name);
          movies.push({
            sId: movie.movie_id ?? "",
            seriesNameRaw: movie.movie_name,
            title,
            year,
            epId: "",
            isRewatch: false,
            createdAt: movie.watched_at ? new Date(movie.watched_at) : new Date(),
          });
        }
      } else if (entry.entryName.includes("tvtime-series/")) {
        for (const item of items) {
          const s = item as TvTimeJsonSeries;
          if (!s.series_name) {
            skippedRows++;
            continue;
          }
          const { title, year } = extractTitleAndYear(s.series_name);
          series.push({
            sId: s.series_id ?? "",
            seriesNameRaw: s.series_name,
            title,
            year,
            isFollowed: s.is_followed ?? true,
            isForLater: s.is_for_later ?? false,
            isArchived: s.is_archived ?? false,
            epWatchCount: 0,
            followedAt: s.followed_at ? new Date(s.followed_at) : null,
            mostRecentEpWatched: null,
          });
        }
      }
    } catch (err) {
      logError("TvTimeImport", "parseTvTimeJsonZip entry error", err, {
        entry: entry.entryName,
      });
      skippedRows++;
    }
  }

  const stats: TvTimeStats = {
    seriesFollowCount: series.length,
    movieWatchCount: movies.length,
    epWatchCount: episodes.length,
    totalSeriesRuntimeSec: 0,
    totalMoviesRuntimeSec: 0,
  };

  log("TvTimeImport", "parseTvTimeJsonZip", {
    series: series.length,
    episodes: episodes.length,
    movies: movies.length,
    skippedRows,
  });

  return { stats, series, episodes, movies, skippedRows };
}
