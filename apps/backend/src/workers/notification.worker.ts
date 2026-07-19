/* eslint-disable no-console */
import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { Show } from "../models/show.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { User } from "../models/user.model.js";
import { PushNotificationService } from "../services/pushNotification.service.js";
import { getShowTitle } from "../models/show.model.js";
import { getImageUrl } from "../services/image.service.js";

export const notificationQueue = new Queue("notifications", { connection: redisConnection });

const TICK_MINUTES = 15;
const MIN_OFFSET_MINUTES = -180;
const MAX_OFFSET_MINUTES = 1440;
const NOTIFIED_TTL_SECONDS = 48 * 60 * 60;

export async function scheduleEpisodeNotifications(): Promise<void> {
  await notificationQueue.add(
    "check-upcoming-episodes",
    {},
    {
      repeat: { pattern: "*/15 * * * *" },
      jobId: "fifteen-min-episode-notifications",
    },
  );
}

export async function processEpisodeNotifications(): Promise<void> {
  const now = new Date();
  const tickMs = TICK_MINUTES * 60 * 1000;

  const earliestAirDate = new Date(now.getTime() + MIN_OFFSET_MINUTES * 60 * 1000);
  const latestAirDate = new Date(now.getTime() + MAX_OFFSET_MINUTES * 60 * 1000);

  const shows = await Show.find({
    "nextEpisodeToAir.airDate": { $gte: earliestAirDate, $lte: latestAirDate },
    type: "tv",
  }).select("title translations nextEpisodeToAir tmdbId posterPath");

  const redisClient = await notificationQueue.client;

  for (const show of shows) {
    if (!show.nextEpisodeToAir) continue;

    const airDate = new Date(show.nextEpisodeToAir.airDate);

    const entries = await WatchEntry.find({
      showId: show._id,
      status: { $in: ["watching", "plan_to_watch"] },
    }).select("userId").lean();

    if (entries.length === 0) continue;

    const userIds = entries.map((e) => e.userId.toString());

    const users = await User.find({ _id: { $in: userIds } })
      .select("preferredLanguage notificationPreferences.notificationOffsetMinutes")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    for (const userId of userIds) {
      try {
        const user = userMap.get(userId);
        if (!user) continue;

        const offsetMinutes = user.notificationPreferences?.notificationOffsetMinutes ?? 0;
        const notifyAt = new Date(airDate.getTime() + offsetMinutes * 60 * 1000);

        if (now < notifyAt) continue;
        if (now.getTime() >= notifyAt.getTime() + tickMs) continue;

        const notifiedKey = `notified:${userId}:${show._id}:S${show.nextEpisodeToAir.season}E${show.nextEpisodeToAir.episode}`;
        const alreadyNotified = await redisClient.get(notifiedKey);
        if (alreadyNotified) continue;

        const locale = user.preferredLanguage ?? "en";
        const showTitle = getShowTitle(show, locale);
        const posterUrl = show.posterPath ? getImageUrl("w500", show.posterPath) : undefined;

        await PushNotificationService.notifyNewEpisode(
          userId,
          showTitle,
          show.nextEpisodeToAir.season,
          show.nextEpisodeToAir.episode,
          show._id.toString(),
          show.tmdbId,
          locale,
          posterUrl,
        );

        await redisClient.set(notifiedKey, "1", { EX: NOTIFIED_TTL_SECONDS });
      } catch (err) {
        console.error(`[NotificationWorker] Failed to notify user ${userId} about ${show.title} S${show.nextEpisodeToAir.season}E${show.nextEpisodeToAir.episode}:`, err);
      }
    }

    console.log(`[NotificationWorker] Processed ${userIds.length} watchers for ${show.title} S${show.nextEpisodeToAir.season}E${show.nextEpisodeToAir.episode}`);
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
