import { Types } from "mongoose";
import { Comment } from "../models/comment.model.js";
import type { EpisodeRef } from "../models/comment.model.js";
import { tmdbService } from "./tmdb.service.js";
import { getTmdbSystemUserId } from "./tmdbSystemUser.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { log, logError } from "../lib/logger.js";

const IMPORT_CACHE_TTL = 6 * 60 * 60;
const REVIEWS_CACHE_TTL = 300;
const INTERNAL_REVIEW_THRESHOLD = 3;
const MAX_CONTENT_LENGTH = 2000;

export async function importTmdbReviewsIfNeeded(
  showId: string,
  tmdbId: number,
  mediaType: "tv" | "movie",
  episodeRef?: EpisodeRef,
): Promise<void> {
  try {
    const importCacheKey = `tmdb-reviews-imported:${showId}`;

    const cached = await getRedisValue(importCacheKey);
    if (cached) {
      log("TmdbReviewImport", "skip — cache hit", { showId });
      return;
    }

    const internalCountFilter: Record<string, unknown> = {
      showId: new Types.ObjectId(showId),
      source: { $in: ["user", "rating"] },
      content: { $ne: "" },
      isHidden: { $ne: true },
    };

    if (episodeRef) {
      internalCountFilter.episodeRef = episodeRef;
    } else {
      internalCountFilter.episodeRef = { $exists: false };
    }

    const internalCount = await Comment.countDocuments(internalCountFilter);
    if (internalCount >= INTERNAL_REVIEW_THRESHOLD) {
      log("TmdbReviewImport", "skip — enough internal reviews", { showId, internalCount });
      await setRedisValue(importCacheKey, "1", IMPORT_CACHE_TTL);
      return;
    }

    const reviewsCacheKey = `tmdb-reviews:${mediaType}:${tmdbId}:1`;
    let reviewsResponse = await getRedisValue(reviewsCacheKey);

    if (!reviewsResponse) {
      const raw =
        mediaType === "tv"
          ? await tmdbService.getTvReviews(tmdbId)
          : await tmdbService.getMovieReviews(tmdbId);
      reviewsResponse = JSON.stringify(raw);
      await setRedisValue(reviewsCacheKey, reviewsResponse, REVIEWS_CACHE_TTL);
    }

    const parsed = JSON.parse(reviewsResponse) as {
      results: Array<{
        id: string;
        author: string;
        content: string;
        author_details?: { rating?: number | null };
      }>;
    };

    const systemUserId = await getTmdbSystemUserId();

    for (const review of parsed.results) {
      const content = review.content.length > MAX_CONTENT_LENGTH
        ? review.content.slice(0, MAX_CONTENT_LENGTH)
        : review.content;

      const tmdbRating = review.author_details?.rating;
      const ratingValue = tmdbRating != null ? Math.round(tmdbRating / 2) : undefined;

      const filter: Record<string, unknown> = {
        showId: new Types.ObjectId(showId),
        externalId: review.id,
      };

      if (episodeRef) {
        filter.episodeRef = episodeRef;
      } else {
        filter.episodeRef = { $exists: false };
      }

      await Comment.findOneAndUpdate(
        filter,
        {
          $set: {
            userId: systemUserId,
            content,
            source: "tmdb",
            repliesDisabled: true,
            ...(ratingValue !== undefined ? { ratingValue } : {}),
          },
          $setOnInsert: {
            showId: new Types.ObjectId(showId),
            images: [],
            isSpoiler: false,
            likesCount: 0,
            replyCount: 0,
            ...(episodeRef ? { episodeRef } : {}),
          },
        },
        { upsert: true, new: true },
      );
    }

    await setRedisValue(importCacheKey, "1", IMPORT_CACHE_TTL);
    log("TmdbReviewImport", "import done", { showId, count: parsed.results.length });
  } catch (err) {
    logError("TmdbReviewImport", "import failed", err, { showId, tmdbId });
  }
}
