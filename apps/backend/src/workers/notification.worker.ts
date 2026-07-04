/* eslint-disable no-console */
import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { Show } from "../models/show.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { User } from "../models/user.model.js";
import { PushNotificationService } from "../services/pushNotification.service.js";
import { getShowTitle } from "../models/show.model.js";

export const notificationQueue = new Queue("notifications", { connection: redisConnection });

export async function scheduleEpisodeNotifications(): Promise<void> {
  await notificationQueue.add(
    "check-upcoming-episodes",
    {},
    {
      repeat: { pattern: "0 * * * *" },
      jobId: "hourly-episode-notifications",
    },
  );
}

export async function processEpisodeNotifications(): Promise<void> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const shows = await Show.find({
    "nextEpisodeToAir.airDate": { $gte: now, $lte: in24h },
    type: "tv",
  }).select("title translations nextEpisodeToAir tmdbId");

  const redisClient = await notificationQueue.client;

  for (const show of shows) {
    if (!show.nextEpisodeToAir) continue;

    const notifiedKey = `notified:${show._id}:S${show.nextEpisodeToAir.season}E${show.nextEpisodeToAir.episode}`;

    const alreadyNotified = await redisClient.get(notifiedKey);
    if (alreadyNotified) continue;

    const entries = await WatchEntry.find({
      showId: show._id,
      status: { $in: ["watching", "plan_to_watch"] },
    }).select("userId").lean();

    const userIds = entries.map((e) => e.userId.toString());

    for (const userId of userIds) {
      const user = await User.findById(userId).select("preferredLanguage").lean();
      const locale = user?.preferredLanguage ?? "en";
      const showTitle = getShowTitle(show, locale);

      await PushNotificationService.notifyNewEpisode(
        userId,
        showTitle,
        show.nextEpisodeToAir.season,
        show.nextEpisodeToAir.episode,
        show._id.toString(),
        show.tmdbId,
        locale,
      );
    }

    await redisClient.set(notifiedKey, "1", { EX: 48 * 60 * 60 });
    console.log(`[NotificationWorker] Notified ${userIds.length} users about ${show.title} S${show.nextEpisodeToAir.season}E${show.nextEpisodeToAir.episode}`);
  }
}

export function createNotificationWorker(): Worker {
  return new Worker(
    "notifications",
    async (job) => {
      if (job.name === "check-upcoming-episodes") {
        await processEpisodeNotifications();
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );
}
