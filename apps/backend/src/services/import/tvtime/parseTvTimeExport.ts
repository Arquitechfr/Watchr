import { parse } from "csv-parse/sync";
import * as fs from "fs";
import AdmZip from "adm-zip";
import { log, logError } from "../../../lib/logger.js";
import type {
  ParsedTvTimeExport,
  TvTimeStats,
  TvTimeSeriesEntry,
  TvTimeEpisodeEntry,
  TvTimeMovieEntry,
} from "./types.js";

/**
 * Parse a Go map[string]string literal as produced by TV Time exports.
 * Format: map[ep_id:6.733513e+06 ep_no:6 s_no:1 uuid:... watch_date:1.715797593004221e+15]
 */
export function parseGoMap(raw: string): Record<string, string> | null {
  if (!raw || !raw.startsWith("map[") || !raw.endsWith("]")) return null;
  const content = raw.slice(4, -1);
  const entries: Record<string, string> = {};
  // T4: Use regex to match key:value pairs where key is alphanumeric/underscore
  // and value is everything until the next key: pattern or end of string
  const regex = /(\w+):([^\s]+(?:\s+(?!\w+:)[^\s]+)*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const value = match[2];
    if (key) entries[key] = value;
  }
  return entries;
}

/**
 * Extract title and year from a name like "Doctor Who (2023)".
 * Returns { title: "Doctor Who", year: 2023 } or { title: "Doctor Who", year: null }.
 */
export function extractTitleAndYear(rawName: string): { title: string; year: number | null } {
  const match = rawName.match(/\s*\((\d{4})\)\s*$/);
  if (match) {
    return {
      title: rawName.slice(0, match.index).trim(),
      year: Number(match[1]),
    };
  }
  return { title: rawName.trim(), year: null };
}

/**
 * Convert microseconds epoch to Date.
 * TV Time stores followed_at and watch_date as microseconds.
 */
function microToDate(us: string | undefined): Date | null {
  if (!us) return null;
  const ms = Number(us) / 1000;
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

/**
 * Parse a "YYYY-MM-DD HH:MM:SS" created_at timestamp.
 */
function parseCreatedAt(raw: string | undefined): Date {
  if (!raw) return new Date();
  const date = new Date(raw.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toBool(value: string | undefined): boolean {
  return value === "true";
}

function toNum(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Extract the CSV buffer from a file path that may be a .zip or .csv.
 * If zip, decompress and find tracking-prod-records-v2.csv (or any CSV).
 */
export async function extractCsvBuffer(filePath: string): Promise<Buffer | null> {
  if (filePath.endsWith(".zip")) {
    try {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      const target =
        entries.find(
          (e) => e.entryName.endsWith(".csv") && e.entryName.includes("tracking-prod-records-v2"),
        ) ??
        entries.find(
          (e) => e.entryName.endsWith(".csv") && e.entryName.includes("tracking-prod-records"),
        ) ??
        entries.find((e) => e.entryName.endsWith(".csv"));
      if (!target) return null;
      return target.getData();
    } catch (err) {
      logError("TvTimeImport", "extractCsvBuffer zip error", err);
      return null;
    }
  }

  if (filePath.endsWith(".csv")) {
    try {
      return fs.readFileSync(filePath);
    } catch (err) {
      logError("TvTimeImport", "extractCsvBuffer csv error", err);
      return null;
    }
  }

  return null;
}

/**
 * T2+T3: Extract multiple CSV buffers from a ZIP for ratings and followed shows.
 * Returns buffers for tracking-prod-records-v2, ratings, and followed_tv_show files.
 */
export interface TvTimeZipContents {
  trackingBuffer: Buffer | null;
  ratingsBuffer: Buffer | null;
  followedBuffer: Buffer | null;
}

export async function extractAllCsvBuffers(filePath: string): Promise<TvTimeZipContents> {
  const result: TvTimeZipContents = {
    trackingBuffer: null,
    ratingsBuffer: null,
    followedBuffer: null,
  };

  if (!filePath.endsWith(".zip")) {
    result.trackingBuffer = await extractCsvBuffer(filePath);
    return result;
  }

  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    result.trackingBuffer =
      entries.find((e) => e.entryName.endsWith(".csv") && e.entryName.includes("tracking-prod-records-v2"))?.getData() ??
      entries.find((e) => e.entryName.endsWith(".csv") && e.entryName.includes("tracking-prod-records"))?.getData() ??
      entries.find((e) => e.entryName.endsWith(".csv"))?.getData() ??
      null;

    // T2: Find ratings file
    result.ratingsBuffer =
      entries.find((e) => e.entryName.endsWith(".csv") && e.entryName.toLowerCase().includes("rating"))?.getData() ??
      null;

    // T3: Find followed_tv_show file
    result.followedBuffer =
      entries.find((e) => e.entryName.endsWith(".csv") && e.entryName.toLowerCase().includes("followed"))?.getData() ??
      null;
  } catch (err) {
    logError("TvTimeImport", "extractAllCsvBuffers zip error", err);
  }

  return result;
}

/**
 * T2: Parse ratings CSV buffer into a map of seriesName → rating.
 */
export function parseRatingsCsv(buffer: Buffer): Map<string, number> {
  const ratings = new Map<string, number>();
  try {
    const content = buffer.toString("utf8");
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false,
      relax_column_count: true,
    }) as Array<Record<string, string>>;

    for (const row of rows) {
      const title = row["series_name"] ?? row["title"] ?? row["name"] ?? "";
      const ratingStr = row["rating"] ?? row["user_rating"] ?? "";
      if (title && ratingStr) {
        const rating = Number(ratingStr);
        if (!isNaN(rating)) {
          ratings.set(title.trim(), rating);
        }
      }
    }
  } catch (err) {
    logError("TvTimeImport", "parseRatingsCsv error", err);
  }
  return ratings;
}

/**
 * T3: Parse followed_tv_show.csv for archived status.
 * Returns a set of series names that are archived.
 */
export function parseFollowedCsv(buffer: Buffer): Set<string> {
  const archived = new Set<string>();
  try {
    const content = buffer.toString("utf8");
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false,
      relax_column_count: true,
    }) as Array<Record<string, string>>;

    for (const row of rows) {
      const title = row["series_name"] ?? row["title"] ?? row["name"] ?? "";
      const isArchived = (row["is_archived"] ?? row["archived"] ?? "").toLowerCase();
      if (title && (isArchived === "true" || isArchived === "1")) {
        archived.add(title.trim());
      }
    }
  } catch (err) {
    logError("TvTimeImport", "parseFollowedCsv error", err);
  }
  return archived;
}

/**
 * Parse the tracking-prod-records-v2.csv buffer into typed collections.
 */
export function parseTrackingRecordsV2(csvBuffer: Buffer): ParsedTvTimeExport {
  const content = csvBuffer.toString("utf8");
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: false,
    relax_column_count: true,
  }) as Array<Record<string, string>>;

  let stats: TvTimeStats | null = null;
  const series: TvTimeSeriesEntry[] = [];
  const episodes: TvTimeEpisodeEntry[] = [];
  const movies: TvTimeMovieEntry[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    try {
      const key = row["key"] ?? "";

      if (key === "tracking-stats") {
        stats = {
          seriesFollowCount: toNum(row["series_follow_count"]),
          movieWatchCount: toNum(row["movie_watch_count"]),
          epWatchCount: toNum(row["ep_watch_count"]),
          totalSeriesRuntimeSec: toNum(row["total_series_runtime"]),
          totalMoviesRuntimeSec: toNum(row["total_movies_runtime"]),
        };
        continue;
      }

      if (key.startsWith("user-series-")) {
        const seriesNameRaw = row["series_name"] ?? "";
        if (!seriesNameRaw) {
          skippedRows++;
          continue;
        }
        const { title, year } = extractTitleAndYear(seriesNameRaw);
        const followedAt = microToDate(row["followed_at"]);
        const mostRecentEpWatched = parseGoMap(row["most_recent_ep_watched"] ?? "");

        series.push({
          sId: row["s_id"] ?? "",
          seriesNameRaw,
          title,
          year,
          isFollowed: toBool(row["is_followed"]),
          isForLater: toBool(row["is_for_later"]),
          isArchived: toBool(row["is_archived"]),
          epWatchCount: toNum(row["ep_watch_count"]),
          followedAt,
          mostRecentEpWatched,
        });
        continue;
      }

      if (key.startsWith("watch-episode-") || key.startsWith("rewatch-episode-")) {
        const seriesNameRaw = row["series_name"] ?? "";
        if (!seriesNameRaw) {
          skippedRows++;
          continue;
        }
        const { title, year } = extractTitleAndYear(seriesNameRaw);
        const isUnitary = toBool(row["is_unitary"]);
        const isSpecial = toBool(row["is_special"]);
        const isRewatch = key.startsWith("rewatch-episode-");
        const createdAt = parseCreatedAt(row["created_at"]);
        const seasonNumber = toNum(row["season_number"]);
        const episodeNumber = toNum(row["episode_number"]);
        const epId = row["ep_id"] ?? "";

        if (isUnitary) {
          // It's a movie, not an episode
          movies.push({
            sId: row["s_id"] ?? "",
            seriesNameRaw,
            title,
            year,
            epId,
            isRewatch,
            createdAt,
          });
        } else {
          episodes.push({
            sId: row["s_id"] ?? "",
            seriesNameRaw,
            title,
            year,
            seasonNumber,
            episodeNumber,
            epId,
            isSpecial,
            isRewatch,
            createdAt,
          });
        }
        continue;
      }

      // Unknown key type — skip silently
      skippedRows++;
    } catch (err) {
      logError("TvTimeImport", "parseTrackingRecordsV2 row error", err, { row });
      skippedRows++;
    }
  }

  log("TvTimeImport", "parseTrackingRecordsV2", {
    series: series.length,
    episodes: episodes.length,
    movies: movies.length,
    skippedRows,
  });

  return { stats, series, episodes, movies, skippedRows };
}
