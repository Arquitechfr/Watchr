import { Types } from "mongoose";
import { Comment } from "../models/comment.model.js";
import type { EpisodeRef } from "../models/comment.model.js";
import { tmdbService } from "./tmdb.service.js";
import type { TmdbReviewsResponse } from "./tmdb.service.js";
import { getTmdbSystemUserId } from "./tmdbSystemUser.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { log, logError } from "../lib/logger.js";
import { translateCommentAsync } from "./aiCommentTranslation.service.js";
import { wsEvents } from "../lib/wsEvents.js";

const IMPORT_CACHE_TTL = 6 * 60 * 60;
const REVIEWS_CACHE_TTL = 300;
const INTERNAL_REVIEW_THRESHOLD = 3;
const MAX_CONTENT_LENGTH = 2000;

function buildEpisodeSuffix(episodeRef?: EpisodeRef): string {
  if (!episodeRef) return "show";
  return `s${episodeRef.season}e${episodeRef.episode}`;
}

export async function importTmdbReviewsIfNeeded(
  showId: string,
  tmdbId: number,
  mediaType: "tv" | "movie",
  episodeRef?: EpisodeRef,
): Promise<void> {
  const epSuffix = buildEpisodeSuffix(episodeRef);
  try {
    const importCacheKey = `tmdb-reviews-imported:${showId}:${epSuffix}`;

    const cached = await getRedisValue(importCacheKey);
    if (cached) {
      log("TmdbReviewImport", "skip — cache hit", { showId, epSuffix });
      return;
    }

    if (episodeRef && mediaType === "movie") {
      log("TmdbReviewImport", "skip — movies have no episodes", { showId });
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
      log("TmdbReviewImport", "skip — enough internal reviews", { showId, internalCount, epSuffix });
      await setRedisValue(importCacheKey, "1", IMPORT_CACHE_TTL);
      return;
    }

    const reviewsCacheKey = `tmdb-reviews:${mediaType}:${tmdbId}:${epSuffix}:1`;
    let reviewsResponse = await getRedisValue(reviewsCacheKey);

    if (!reviewsResponse) {
      let raw: TmdbReviewsResponse;
      if (episodeRef && mediaType === "tv") {
        raw = await tmdbService.getEpisodeReviews(tmdbId, episodeRef.season, episodeRef.episode);
      } else if (mediaType === "tv") {
        raw = await tmdbService.getTvReviews(tmdbId);
      } else {
        raw = await tmdbService.getMovieReviews(tmdbId);
      }
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
    const startTime = new Date();
    let newCount = 0;

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

      const upserted = await Comment.findOneAndUpdate(
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

      translateCommentAsync(upserted._id.toString(), content).catch((err) =>
        logError("TmdbReviewImport", "translation failed", err, { commentId: upserted._id.toString() }),
      );

      if (upserted.createdAt >= startTime) {
        newCount++;
      }
    }

    if (newCount > 0) {
      wsEvents.emit("comment:created", {
        showId,
        comment: { id: "tmdb-import" },
      });
    }

    await setRedisValue(importCacheKey, "1", IMPORT_CACHE_TTL);
    log("TmdbReviewImport", "import done", { showId, epSuffix, count: parsed.results.length });
  } catch (err) {
    logError("TmdbReviewImport", "import failed", err, { showId, tmdbId, epSuffix });
  }
}
