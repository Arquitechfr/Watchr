/* eslint-disable no-console */
import { Queue, Worker } from "bullmq";
import { Types } from "mongoose";
import { redisConnection } from "../config/env.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Show } from "../models/show.model.js";
import { refreshShowFromTmdb, syncEpisodesForShow } from "../services/cacheShow.service.js";
import { tmdbService } from "../services/tmdb.service.js";
import { wsEvents } from "../lib/wsEvents.js";

export const episodeSyncQueue = new Queue("episode-sync", { connection: redisConnection });

export async function scheduleEpisodeSync(): Promise<void> {
  await episodeSyncQueue.add(
    "sync",
    {},
    {
      repeat: { pattern: "0 4 * * *" },
      jobId: "daily-episode-sync",
    },
  );
}

export interface RefreshShowJobData {
  tmdbId: number;
}

export async function scheduleShowRefresh(tmdbId: number): Promise<void> {
  await episodeSyncQueue.add(
    "refreshShow",
    { tmdbId } satisfies RefreshShowJobData,
    {
      jobId: `refresh-show-${tmdbId}`,
      removeOnComplete: true,
      removeOnFail: 5,
    },
  );
}

export async function schedulePopularSync(): Promise<void> {
  await episodeSyncQueue.add(
    "syncPopular",
    {},
    {
      repeat: { pattern: "0 3 * * 0" },
      jobId: "weekly-popular-sync",
    },
  );
}

export function createEpisodeSyncWorker(): Worker {
  return new Worker(
    "episode-sync",
    async (job) => {
      if (job.name === "refreshShow") {
        const { tmdbId } = job.data as RefreshShowJobData;
        await refreshShowFromTmdb(tmdbId);
        return;
      }

      if (job.name === "syncPopular") {
        await syncTrendingShows();
        return;
      }

      const showIds = await WatchEntry.distinct("showId", {
        status: { $in: ["watching", "plan_to_watch"] },
      });

      for (const showId of showIds) {
        try {
          await syncEpisodesForShowById(showId as unknown as Types.ObjectId);
        } catch (err) {
          console.error(`Episode sync failed for show ${showId}:`, err);
        }
      }
    },
    { connection: redisConnection, concurrency: 1 },
  );
}

export async function syncTrendingShows(): Promise<void> {
  let trending: Awaited<ReturnType<typeof tmdbService.getTrendingTv>> = [];
  try {
    trending = await tmdbService.getTrendingTv(20);
  } catch (err) {
    console.error("Failed to fetch trending TV shows:", err);
  }

  for (const item of trending) {
    try {
      await refreshShowFromTmdb(item.id);
    } catch (err) {
      console.error(`Failed to refresh trending show ${item.id}:`, err);
    }
  }
}

export async function syncEpisodesForShowById(showId: Types.ObjectId): Promise<void> {
  const show = await Show.findById(showId);
  if (!show) {
    throw new Error("Show not found");
  }
  await syncEpisodesForShow(show);

  const userIds = await WatchEntry.distinct("userId", { showId });
  wsEvents.emit("upcoming:updated", { userIds: userIds.map(String) });
  wsEvents.emit("show:updated", {
    showId: show._id.toString(),
    updatedAt: new Date().toISOString(),
  });
}

