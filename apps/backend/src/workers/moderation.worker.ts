import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { Comment } from "../models/comment.model.js";
import { moderateComment } from "../services/aiModeration.service.js";
import { getShowTitle } from "../models/show.model.js";
import { Show } from "../models/show.model.js";
import { log, logError } from "../lib/logger.js";

let moderationQueue: Queue | null = null;

export function getModerationQueue(): Queue {
  if (!moderationQueue) {
    moderationQueue = new Queue("moderation", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return moderationQueue;
}

export function createModerationWorker(): Worker {
  return new Worker(
    "moderation",
    async (_job) => {
      const batchSize = 50;
      const comments = await Comment.find({ needsReview: true })
        .limit(batchSize)
        .lean();

      if (comments.length === 0) {
        log("ModerationWorker", "no comments to review");
        return;
      }

      const showIds = [...new Set(comments.map((c) => c.showId.toString()))];
      const shows = await Show.find({ _id: { $in: showIds } }).lean();
      const showMap = new Map(shows.map((s) => [s._id.toString(), s]));

      for (const comment of comments) {
        try {
          const show = showMap.get(comment.showId.toString());
          const showTitle = show ? getShowTitle(show, "en") : undefined;
          const moderation = await moderateComment(comment.content, showTitle);

          if (moderation.confidence >= 0.8) {
            if (moderation.isToxic) {
              await Comment.updateOne(
                { _id: comment._id },
                { $set: { isHidden: true, needsReview: false } },
              );
              log("ModerationWorker", "comment hidden after re-moderation", { commentId: comment._id.toString() });
            } else if (moderation.isSpoiler) {
              await Comment.updateOne(
                { _id: comment._id },
                { $set: { isSpoiler: true, needsReview: false } },
              );
              log("ModerationWorker", "comment marked spoiler after re-moderation", { commentId: comment._id.toString() });
            } else {
              await Comment.updateOne(
                { _id: comment._id },
                { $set: { needsReview: false } },
              );
            }
          } else {
            await Comment.updateOne(
              { _id: comment._id },
              { $set: { needsReview: false } },
            );
          }
        } catch (err) {
          logError("ModerationWorker", "re-moderation failed", err, { commentId: comment._id.toString() });
        }
      }

      log("ModerationWorker", "batch complete", { processed: comments.length });
    },
    {
      connection: redisConnection,
      concurrency: 1,
      limiter: { max: 1, duration: 10_000 },
    },
  );
}
