import * as fs from "fs";
import { Types } from "mongoose";
import { WatchEntry, WatchStatus } from "../models/watchEntry.model.js";
import { Rating } from "../models/rating.model.js";
import { normalizeValue } from "./rating.service.js";
import { ImportJob } from "../models/importJob.model.js";
import { sleep } from "../lib/rateLimiter.js";
import { ApiError } from "../middleware/error.middleware.js";
import { wsEvents } from "../lib/wsEvents.js";
import { ParsedRecord, ImportResult, ImportSource } from "./import/types.js";
import { parseFile, detectSource, getParser, matchShow, extractImportFiles } from "./import/parserRegistry.js";
import { TvTimeParser } from "./import/tvtimeParser.js";

export type { ParsedRecord, ImportResult, ImportSource };
export { matchShow, extractImportFiles };

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
  const parser = new TvTimeParser();
  return parser.parse(filePath);
}

export function normalizeTvTimeStatus(status?: string): WatchStatus | undefined {
  const parser = new TvTimeParser();
  return parser.normalizeStatus(status);
}

export async function processImport(
  userId: string,
  jobId: string,
  filePath: string,
  source?: ImportSource,
): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0,
    processed: 0,
    matched: 0,
    failed: 0,
    errors: [],
  };

  try {
    const detectedSource = source ?? detectSource(filePath);
    const allRecords = parseFile(filePath, detectedSource);

    result.total = allRecords.length;
    await updateProgress(jobId, userId, result);

    const parser = detectedSource !== "unknown" ? getParser(detectedSource) : null;

    for (let index = 0; index < allRecords.length; index++) {
      const record = allRecords[index];
      const line = index + 1;
      result.processed++;

      try {
        if (!record.title && !record.imdbId && !record.tmdbId) {
          throw new Error("Missing title");
        }

        const match = await matchShow(record);
        if (!match) {
          result.failed++;
          result.errors.push({ line, reason: `Ambiguous or no match for "${record.title}"` });
          if (result.processed % 10 === 0) await updateProgress(jobId, userId, result);
          continue;
        }

        const status = parser?.normalizeStatus(record.status) ?? normalizeGenericStatus(record.status);

        if (record.season !== undefined && record.episode !== undefined) {
          // G2: Use $addToSet to avoid overwriting existing watched episodes
          await WatchEntry.findOneAndUpdate(
            { userId: new Types.ObjectId(userId), showId: match.show._id },
            {
              $set: { status: status || (record.status as WatchStatus) || "plan_to_watch" },
              $addToSet: {
                watchedEpisodes: {
                  season: record.season,
                  episode: record.episode,
                  watchedAt: record.watchedAt ? new Date(record.watchedAt) : new Date(),
                },
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        } else {
          // No season/episode — update status only, preserve existing watchedEpisodes
          await WatchEntry.findOneAndUpdate(
            { userId: new Types.ObjectId(userId), showId: match.show._id },
            {
              $set: { status: status || (record.status as WatchStatus) || "plan_to_watch" },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        }

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
            { $set: { value: normalizeValue(record.rating) } },
            { upsert: true, new: true },
          );
        }

        result.matched++;
      } catch (err) {
        result.failed++;
        const reason = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ line, reason });
      }

      if (result.processed % 10 === 0) {
        await updateProgress(jobId, userId, result);
      }
      if (result.processed % 50 === 0) {
        await sleep(50);
      }
    }

    await updateProgress(jobId, userId, result);

    await ImportJob.findByIdAndUpdate(jobId, {
      status: "completed",
      completedAt: new Date(),
      progress: { total: result.total, processed: result.processed, matched: result.matched, failed: result.failed },
      errorLog: result.errors,
    });

    wsEvents.emit("import:progress", {
      userId,
      jobId,
      status: "completed",
      progress: { total: result.total, processed: result.processed, matched: result.matched, failed: result.failed },
    });

    return result;
  } catch (err) {
    await ImportJob.findByIdAndUpdate(jobId, {
      status: "failed",
      completedAt: new Date(),
    });
    wsEvents.emit("import:progress", {
      userId,
      jobId,
      status: "failed",
      progress: { total: result.total, processed: result.processed, matched: result.matched, failed: result.failed },
    });
    throw new ApiError(500, "IMPORT_FAILED", err instanceof Error ? err.message : "Import failed");
  } finally {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // Ignore cleanup errors.
    }
  }
}

function normalizeGenericStatus(status?: string): WatchStatus | undefined {
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

async function updateProgress(jobId: string, userId: string, result: ImportResult): Promise<void> {
  const status = result.processed >= result.total && result.total > 0 ? "completed" : "processing";
  await ImportJob.findByIdAndUpdate(jobId, {
    status,
    progress: {
      total: result.total,
      processed: result.processed,
      matched: result.matched,
      failed: result.failed,
    },
    errorLog: result.errors,
  });
  wsEvents.emit("import:progress", {
    userId,
    jobId,
    status,
    progress: {
      total: result.total,
      processed: result.processed,
      matched: result.matched,
      failed: result.failed,
    },
  });
}
