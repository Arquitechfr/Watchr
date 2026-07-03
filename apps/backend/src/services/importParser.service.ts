import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { Types } from "mongoose";
import { tmdbService } from "./tmdb.service.js";
import { Show } from "../models/show.model.js";
import { WatchEntry, WatchStatus } from "../models/watchEntry.model.js";
import { Rating } from "../models/rating.model.js";
import { ImportJob } from "../models/importJob.model.js";
import { sleep } from "../lib/rateLimiter.js";
import { ApiError } from "../middleware/error.middleware.js";
import { ShowDocument } from "./cacheShow.service.js";

export interface ImportResult {
  total: number;
  processed: number;
  matched: number;
  failed: number;
  errors: Array<{ line: number; reason: string }>;
}

export interface ParsedRecord {
  title: string;
  year?: number;
  status?: string;
  rating?: number;
  season?: number;
  episode?: number;
  watchedAt?: string;
}

export async function extractImportFiles(zipPath: string): Promise<string[]> {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "watchr-import-"));

  for (const entry of entries) {
    if (entry.entryName.endsWith(".csv")) {
      zip.extractEntryTo(entry, tempDir, false, true);
    }
  }

  return fs
    .readdirSync(tempDir)
    .filter((name) => name.endsWith(".csv"))
    .map((name) => path.join(tempDir, name));
}

export function detectCsvVariant(filePath: string): "tracking" | "tracking-v2" | "unknown" {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  if (lines.length === 0) return "unknown";

  const header = lines[0].toLowerCase();
  if (header.includes("tracking-prod-records") || header.includes("records-v2")) {
    return "tracking-v2";
  }
  if (
    header.includes("title") &&
    (header.includes("status") || header.includes("watched") || header.includes("rating"))
  ) {
    return "tracking";
  }
  return "unknown";
}

export function parseCsvRecords(filePath: string): ParsedRecord[] {
  const content = fs.readFileSync(filePath, "utf8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: false,
  }) as Array<Record<string, string>>;

  return records.map((row) => {
    const title = row["title"] || row["show_name"] || row["name"] || "";
    const year = row["year"] || row["release_year"] || row["first_air_year"] || "";
    const status = row["status"] || row["watch_status"] || row["tracking_status"] || "";
    const rating = row["rating"] || row["your_rating"] || row["score"] || "";
    const season = row["season"] || row["season_number"] || "";
    const episode = row["episode"] || row["episode_number"] || "";
    const watchedAt = row["watched_at"] || row["updated_at"] || row["date"] || "";

    return {
      title: title.trim(),
      year: year ? Number(year) : undefined,
      status: status.trim() || undefined,
      rating: rating ? Number(rating) : undefined,
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined,
      watchedAt: watchedAt.trim() || undefined,
    };
  });
}

export function normalizeTvTimeStatus(status?: string): WatchStatus | undefined {
  const normalized = (status || "").toLowerCase().replace(/\s+/g, "_");
  const mapping: Record<string, WatchStatus> = {
    watching: "watching",
    completed: "completed",
    "plan_to_watch": "plan_to_watch",
    dropped: "dropped",
    watched: "completed",
    finished: "completed",
    on_hold: "plan_to_watch",
  };
  return mapping[normalized];
}

export async function matchShow(
  record: ParsedRecord,
): Promise<{ show: ShowDocument; type: "tv" | "movie" } | null> {
  if (!record.title) return null;

  const query = record.year ? `${record.title} ${record.year}` : record.title;
  const tvResults = await tmdbService.searchShows(query);
  await sleep(250);
  const movieResults = await tmdbService.searchMovies(query);

  const tvMatch = tvResults[0];
  const movieMatch = movieResults[0];

  if (tvMatch && movieMatch) {
    const tvTitle = (tvMatch.name || tvMatch.title || "").toLowerCase();
    const movieTitle = (movieMatch.name || movieMatch.title || "").toLowerCase();
    const searchTitle = record.title.toLowerCase();
    if (tvTitle === searchTitle && movieTitle !== searchTitle) {
      return { show: await findOrCreateShow(tvMatch.id, "tv"), type: "tv" };
    }
    if (movieTitle === searchTitle && tvTitle !== searchTitle) {
      return { show: await findOrCreateShow(movieMatch.id, "movie"), type: "movie" };
    }
    if (tvTitle !== movieTitle) {
      return null;
    }
  }

  if (tvMatch) {
    return { show: await findOrCreateShow(tvMatch.id, "tv"), type: "tv" };
  }

  if (movieMatch) {
    return { show: await findOrCreateShow(movieMatch.id, "movie"), type: "movie" };
  }

  return null;
}

async function findOrCreateShow(tmdbId: number, type: "tv" | "movie"): Promise<ShowDocument> {
  let show = await Show.findOne({ tmdbId });
  if (!show) {
    const details =
      type === "tv"
        ? await tmdbService.getTvDetails(tmdbId)
        : await tmdbService.getMovieDetails(tmdbId);
    const { upsertShowFromTmdb } = await import("./cacheShow.service.js");
    show = await upsertShowFromTmdb(type, details);
  }
  return show;
}

export async function processImport(
  userId: string,
  jobId: string,
  zipPath: string,
): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0,
    processed: 0,
    matched: 0,
    failed: 0,
    errors: [],
  };

  try {
    const files = await extractImportFiles(zipPath);
    const allRecords: ParsedRecord[] = [];
    for (const file of files) {
      const variant = detectCsvVariant(file);
      if (variant === "unknown") continue;
      const records = parseCsvRecords(file);
      allRecords.push(...records);
    }

    result.total = allRecords.length;
    await updateProgress(jobId, result);

    for (let index = 0; index < allRecords.length; index++) {
      const record = allRecords[index];
      const line = index + 1;
      result.processed++;

      try {
        if (!record.title) {
          throw new Error("Missing title");
        }

        const match = await matchShow(record);
        if (!match) {
          result.failed++;
          result.errors.push({ line, reason: `Ambiguous or no match for "${record.title}"` });
          await updateProgress(jobId, result);
          continue;
        }

        const status = normalizeTvTimeStatus(record.status);
        const watchedEpisodes = record.season !== undefined && record.episode !== undefined
          ? [{ season: record.season, episode: record.episode, watchedAt: new Date() }]
          : [];

        await WatchEntry.findOneAndUpdate(
          { userId: new Types.ObjectId(userId), showId: match.show._id },
          {
            $set: {
              status: status || "plan_to_watch",
              watchedEpisodes,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        if (record.rating && record.rating >= 1 && record.rating <= 10) {
          const episodeRef =
            record.season !== undefined && record.episode !== undefined
              ? { season: record.season, episode: record.episode }
              : undefined;
          await Rating.findOneAndUpdate(
            {
              userId: new Types.ObjectId(userId),
              showId: match.show._id,
              episodeRef: episodeRef || { $exists: false },
            },
            { $set: { value: record.rating } },
            { upsert: true, new: true },
          );
        }

        result.matched++;
      } catch (err) {
        result.failed++;
        const reason = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ line, reason });
      }

      await updateProgress(jobId, result);
      await sleep(250);
    }

    await ImportJob.findByIdAndUpdate(jobId, {
      status: "completed",
      completedAt: new Date(),
      progress: { total: result.total, processed: result.processed, matched: result.matched, failed: result.failed },
      errorLog: result.errors,
    });

    return result;
  } catch (err) {
    await ImportJob.findByIdAndUpdate(jobId, {
      status: "failed",
      completedAt: new Date(),
    });
    throw new ApiError(500, "IMPORT_FAILED", err instanceof Error ? err.message : "Import failed");
  } finally {
    try {
      fs.rmSync(zipPath, { force: true });
    } catch {
      // Ignore cleanup errors.
    }
  }
}

async function updateProgress(jobId: string, result: ImportResult): Promise<void> {
  await ImportJob.findByIdAndUpdate(jobId, {
    status: result.processed >= result.total && result.total > 0 ? "completed" : "processing",
    progress: {
      total: result.total,
      processed: result.processed,
      matched: result.matched,
      failed: result.failed,
    },
    errorLog: result.errors,
  });
}
