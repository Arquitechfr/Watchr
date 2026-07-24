import { Types } from "mongoose";
import * as fs from "fs";
import { ImportJob, ImportProgress } from "../../../models/importJob.model.js";
import { WatchEntry } from "../../../models/watchEntry.model.js";
import { Rating } from "../../../models/rating.model.js";
import { PendingImportReview } from "../../../models/pendingImportReview.model.js";
import { Show, IShow } from "../../../models/show.model.js";
import { wsEvents } from "../../../lib/wsEvents.js";
import { log, logError } from "../../../lib/logger.js";
import { extractCsvBuffer, parseTrackingRecordsV2, extractAllCsvBuffers, parseRatingsCsv, parseFollowedCsv } from "./parseTvTimeExport.js";
import { isTvTimeJsonZip, parseTvTimeJsonZip } from "./parseTvTimeJson.js";
import { matchToTmdb } from "./matchTmdb.js";
import { resolveWatchedEpisodes, type MatchedSeries } from "./resolveWatchedEpisodes.js";
import { upsertShowFromTmdb } from "../../cacheShow.service.js";
import { tmdbService } from "../../tmdb.service.js";
import { scheduleShowRefresh } from "../../../workers/episodeSync.worker.js";
import type { ParsedTvTimeExport, TmdbMatchResult, TvTimeEpisodeEntry } from "./types.js";

export interface TvTimeImportResult {
  total: number;
  matched: number;
  pendingReview: number;
  skipped: number;
  errors: Array<{ line: number; reason: string }>;
}

async function findOrCreateShow(tmdbId: number, type: "tv" | "movie"): Promise<IShow> {
  let show = await Show.findOne({ tmdbId });
  if (!show) {
    const details =
      type === "tv"
        ? await tmdbService.getTvDetails(tmdbId)
        : await tmdbService.getMovieDetails(tmdbId);
    show = await upsertShowFromTmdb(type, details);
    if (type === "tv") {
      await scheduleShowRefresh(tmdbId);
    }
  }
  return show;
}

async function updateJobProgress(
  jobId: string,
  userId: string,
  progress: Partial<ImportProgress> & { pendingReview?: number },
  status: string,
): Promise<void> {
  await ImportJob.findByIdAndUpdate(jobId, {
    status,
    progress: {
      total: progress.total ?? 0,
      processed: progress.processed ?? 0,
      matched: progress.matched ?? 0,
      failed: progress.failed ?? 0,
      pendingReview: progress.pendingReview ?? 0,
    },
  });
  wsEvents.emit("import:progress", {
    userId,
    jobId,
    status,
    progress: {
      total: progress.total ?? 0,
      processed: progress.processed ?? 0,
      matched: progress.matched ?? 0,
      failed: progress.failed ?? 0,
      pendingReview: progress.pendingReview ?? 0,
    },
  });
}

/**
 * Create PendingImportReview entries for unmatched items.
 */
async function createPendingReviews(
  userId: string,
  jobId: string,
  matchResults: TmdbMatchResult[],
  sourceType: "series" | "movie",
): Promise<number> {
  const pending = matchResults.filter((r) => !r.matched && r.candidates.length > 0);
  if (pending.length === 0) return 0;

  const docs = pending.map((r) => ({
    userId: new Types.ObjectId(userId),
    importJobId: new Types.ObjectId(jobId),
    sourceType,
    sourceTitle: r.sourceTitle,
    sourceYear: r.sourceYear,
    tvtimeInternalId: r.tvtimeInternalId,
    candidates: r.candidates.map((c) => ({
      tmdbId: c.tmdbId,
      title: c.title,
      year: c.year,
      posterPath: c.posterPath,
      confidenceScore: c.confidenceScore,
    })),
    status: "pending" as const,
    resolvedTmdbId: null,
  }));

  await PendingImportReview.insertMany(docs);
  return pending.length;
}

/**
 * Create WatchEntry for auto-matched movies.
 */
async function createMovieWatchEntries(
  userId: string,
  matchResults: TmdbMatchResult[],
): Promise<number> {
  let count = 0;
  for (const result of matchResults) {
    if (!result.matched || !result.bestMatch) continue;
    try {
      const show = await findOrCreateShow(result.bestMatch.tmdbId, "movie");
      await WatchEntry.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), showId: show._id },
        {
          $set: {
            status: "completed",
            watchedEpisodes: [],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      count++;
    } catch (err) {
      logError("TvTimeImport", "createMovieWatchEntries error", err, {
        title: result.sourceTitle,
      });
    }
  }
  return count;
}

/**
 * Main TV Time import pipeline.
 */
export async function processTvTimeImport(
  userId: string,
  jobId: string,
  sourceFile: string,
): Promise<TvTimeImportResult> {
  const result: TvTimeImportResult = {
    total: 0,
    matched: 0,
    pendingReview: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Step 1: Detect format and parse (CSV or JSON)
    await updateJobProgress(jobId, userId, { total: 0, processed: 0 }, "processing");

    let parsed: ParsedTvTimeExport;

    // T1: Check for new JSON format first
    if (isTvTimeJsonZip(sourceFile)) {
      log("TvTimeImport", "Detected new JSON format", { jobId });
      parsed = parseTvTimeJsonZip(sourceFile);
    } else {
      // Legacy CSV format
      const csvBuffer = await extractCsvBuffer(sourceFile);
      if (!csvBuffer) {
        throw new Error("No valid CSV or JSON file found in the uploaded file");
      }
      parsed = parseTrackingRecordsV2(csvBuffer);
    }
    result.total = parsed.series.length + parsed.movies.length;
    result.skipped = parsed.skippedRows;

    await updateJobProgress(jobId, userId, {
      total: result.total,
      processed: 0,
      matched: 0,
      pendingReview: 0,
    }, "processing");

    // Step 3: Match series to TMDB
    const seriesEntries = parsed.series.map((s) => ({
      title: s.title,
      year: s.year,
      tvtimeInternalId: s.sId,
    }));
    const seriesMatches = await matchToTmdb(seriesEntries, "tv");

    // Step 4: Match movies to TMDB
    const movieEntries = parsed.movies.map((m) => ({
      title: m.title,
      year: m.year,
      tvtimeInternalId: m.sId,
    }));
    const movieMatches = await matchToTmdb(movieEntries, "movie");

    // Step 5: Create WatchEntries for matched movies
    const matchedMoviesCount = await createMovieWatchEntries(userId, movieMatches);

    // Step 6: Create Show records for matched series, then resolve watched episodes
    const matchedSeries: MatchedSeries[] = [];
    for (const result of seriesMatches) {
      if (!result.matched || !result.bestMatch) continue;
      try {
        const show = await findOrCreateShow(result.bestMatch.tmdbId, "tv");
        matchedSeries.push({
          tmdbId: result.bestMatch.tmdbId,
          showId: show._id as Types.ObjectId,
          sId: result.tvtimeInternalId,
        });
      } catch (err) {
        logError("TvTimeImport", "findOrCreateShow series error", err, {
          tmdbId: result.bestMatch.tmdbId,
          title: result.sourceTitle,
        });
      }
    }
    const episodeEntries: TvTimeEpisodeEntry[] = parsed.episodes;
    await resolveWatchedEpisodes(userId, matchedSeries, episodeEntries);

    // Step 7: Create pending reviews for unmatched items
    const pendingSeriesCount = await createPendingReviews(userId, jobId, seriesMatches, "series");
    const pendingMoviesCount = await createPendingReviews(userId, jobId, movieMatches, "movie");

    // T2+T3: Import ratings and update archived shows (legacy CSV format only)
    if (!isTvTimeJsonZip(sourceFile)) {
      const zipContents = await extractAllCsvBuffers(sourceFile);

      // T2: Import ratings
      if (zipContents.ratingsBuffer) {
        const ratingsMap = parseRatingsCsv(zipContents.ratingsBuffer);
        for (const [seriesName, ratingValue] of ratingsMap) {
          // Find the matched show by series name
          const seriesMatch = seriesMatches.find(
            (r) => r.sourceTitle.toLowerCase() === seriesName.toLowerCase(),
          );
          if (seriesMatch?.matched && seriesMatch.bestMatch) {
            try {
              const show = await findOrCreateShow(seriesMatch.bestMatch.tmdbId, "tv");
              await Rating.findOneAndUpdate(
                {
                  userId: new Types.ObjectId(userId),
                  showId: show._id,
                  episodeRef: { $exists: false },
                },
                { $set: { value: ratingValue } },
                { upsert: true, new: true },
              );
            } catch (err) {
              logError("TvTimeImport", "rating import error", err, { seriesName });
            }
          }
        }
        log("TvTimeImport", "Ratings imported", { count: ratingsMap.size, jobId });
      }

      // T3: Update archived shows to dropped status
      if (zipContents.followedBuffer) {
        const archivedNames = parseFollowedCsv(zipContents.followedBuffer);
        for (const name of archivedNames) {
          const seriesMatch = seriesMatches.find(
            (r) => r.sourceTitle.toLowerCase() === name.toLowerCase(),
          );
          if (seriesMatch?.matched && seriesMatch.bestMatch) {
            try {
              const show = await findOrCreateShow(seriesMatch.bestMatch.tmdbId, "tv");
              await WatchEntry.findOneAndUpdate(
                { userId: new Types.ObjectId(userId), showId: show._id },
                { $set: { status: "dropped" } },
                { upsert: true, new: true, setDefaultsOnInsert: true },
              );
            } catch (err) {
              logError("TvTimeImport", "archived update error", err, { name });
            }
          }
        }
        log("TvTimeImport", "Archived shows updated", { count: archivedNames.size, jobId });
      }
    }

    // Step 8: Compute final counts
    result.matched = matchedSeries.length + matchedMoviesCount;
    result.pendingReview = pendingSeriesCount + pendingMoviesCount;

    await updateJobProgress(jobId, userId, {
      total: result.total,
      processed: result.total,
      matched: result.matched,
      failed: result.pendingReview,
      pendingReview: result.pendingReview,
    }, "completed");

    log("TvTimeImport", "processTvTimeImport completed", {
      jobId,
      total: result.total,
      matched: result.matched,
      pendingReview: result.pendingReview,
      skipped: result.skipped,
    });

    return result;
  } catch (err) {
    logError("TvTimeImport", "processTvTimeImport failed", err, { jobId });
    await ImportJob.findByIdAndUpdate(jobId, {
      status: "failed",
      completedAt: new Date(),
    });
    wsEvents.emit("import:progress", {
      userId,
      jobId,
      status: "failed",
      progress: {
        total: result.total,
        processed: 0,
        matched: 0,
        failed: result.total,
      },
    });
    throw err;
  } finally {
    // Only clean up temp upload files, not assets
    if (!sourceFile.includes("assets")) {
      try {
        fs.rmSync(sourceFile, { force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Resolve a pending review item with a user-selected TMDB ID.
 */
export async function resolvePendingReview(
  reviewId: string,
  userId: string,
  tmdbId: number | null,
  skip: boolean,
): Promise<void> {
  const review = await PendingImportReview.findOne({
    _id: new Types.ObjectId(reviewId),
    userId: new Types.ObjectId(userId),
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.status !== "pending") {
    throw new Error("Review already resolved");
  }

  if (skip) {
    review.status = "skipped";
    await review.save();
    return;
  }

  if (tmdbId === null) {
    throw new Error("tmdbId is required when not skipping");
  }

  const type = review.sourceType === "series" ? "tv" : "movie";
  const show = await findOrCreateShow(tmdbId, type);

  if (type === "tv") {
    // Create a basic WatchEntry — episodes will need to be resolved separately
    await WatchEntry.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), showId: show._id },
      {
        $set: {
          status: "watching",
          watchedEpisodes: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } else {
    await WatchEntry.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), showId: show._id },
      {
        $set: {
          status: "completed",
          watchedEpisodes: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  review.status = "resolved";
  review.resolvedTmdbId = tmdbId;
  await review.save();
}
