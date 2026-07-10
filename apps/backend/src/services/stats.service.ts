import { Types } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { CommentLike } from "../models/commentLike.model.js";
import { CommentReaction } from "../models/commentReaction.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { User } from "../models/user.model.js";
import { getShowTitle } from "../models/show.model.js";
import { generateInsights, type AiInsight } from "./aiInsights.service.js";

export interface GenreStat {
  id: number;
  name: string;
  count: number;
}

export interface RecentActivityItem {
  commentId: string;
  content: string;
  showId: string;
  showTitle: string;
  tmdbId: number;
  createdAt: string;
}

export interface UserStats {
  commentsCount: number;
  reactionsCount: number;
  likesCount: number;
  tvCount: number;
  movieCount: number;
  episodesWatched: number;
  hoursWatched: number;
  watchStreak: number;
  memberSince: string;
  genreBreakdown: GenreStat[];
  recentActivity: RecentActivityItem[];
  aiInsights?: AiInsight[];
}

const DEFAULT_EPISODE_RUNTIME = 45;

export async function getUserStats(userId: string, language = "en"): Promise<UserStats> {
  const userObjectId = new Types.ObjectId(userId);

  const [commentsCount, reactionsCount, likesCount, user, watchEntries] = await Promise.all([
    Comment.countDocuments({ userId: userObjectId }),
    CommentReaction.countDocuments({ userId: userObjectId }),
    CommentLike.countDocuments({ userId: userObjectId }),
    User.findById(userObjectId).select("createdAt").lean(),
    WatchEntry.find({ userId: userObjectId }).populate("showId", "type runtime seasons genres translations").lean(),
  ]);

  let tvCount = 0;
  let movieCount = 0;
  let episodesWatched = 0;
  let totalMinutes = 0;
  const genreMap = new Map<number, { id: number; name: string; count: number }>();
  const watchedDates = new Set<string>();

  for (const entry of watchEntries) {
    const show = entry.showId as unknown as {
      _id: Types.ObjectId;
      type: "tv" | "movie";
      runtime?: number;
      seasons?: Array<{
        seasonNumber: number;
        episodes: Array<{ episodeNumber: number; runtime?: number }>;
      }>;
      genres?: Array<{ id: number; name?: string }>;
      translations?: Map<string, { genres?: Array<{ id: number; name?: string }> }>;
    };

    if (!show) continue;

    if (show.type === "tv") {
      tvCount++;
    } else {
      movieCount++;
    }

    if (show.genres) {
      for (const genre of show.genres) {
        const existing = genreMap.get(genre.id);
        if (existing) {
          existing.count++;
        } else {
          genreMap.set(genre.id, { id: genre.id, name: genre.name ?? "Unknown", count: 1 });
        }
      }
    }

    for (const watched of entry.watchedEpisodes) {
      episodesWatched++;

      if (watched.watchedAt) {
        const dateStr = watched.watchedAt.toISOString().split("T")[0];
        watchedDates.add(dateStr);
      }

      if (show.type === "movie") {
        totalMinutes += show.runtime ?? 0;
      } else {
        const season = show.seasons?.find((s) => s.seasonNumber === watched.season);
        const episode = season?.episodes.find((e) => e.episodeNumber === watched.episode);
        totalMinutes += episode?.runtime ?? show.runtime ?? DEFAULT_EPISODE_RUNTIME;
      }
    }
  }

  const genreBreakdown = Array.from(genreMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const watchStreak = computeStreak(watchedDates);

  const recentComments = await Comment.find({ userId: userObjectId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("showId", "tmdbId title translations")
    .lean();

  const recentActivity: RecentActivityItem[] = recentComments
    .filter((comment) => comment.showId)
    .map((comment) => {
      const show = comment.showId as unknown as {
        _id: Types.ObjectId;
        tmdbId: number;
        title: string;
        translations?: Map<string, { title?: string }>;
      };
      return {
        commentId: comment._id.toString(),
        content: comment.content,
        showId: show._id.toString(),
        showTitle: getShowTitle(show, language),
        tmdbId: show.tmdbId,
        createdAt: comment.createdAt.toISOString(),
      };
    });

  const baseStats: UserStats = {
    commentsCount,
    reactionsCount,
    likesCount,
    tvCount,
    movieCount,
    episodesWatched,
    hoursWatched: Math.floor(totalMinutes / 60),
    watchStreak,
    memberSince: user?.createdAt.toISOString() ?? new Date().toISOString(),
    genreBreakdown,
    recentActivity,
  };

  const aiInsights = await generateInsights(userId, baseStats, language);
  if (aiInsights) {
    baseStats.aiInsights = aiInsights;
  }

  return baseStats;
}

function computeStreak(watchedDates: Set<string>): number {
  if (watchedDates.size === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (!watchedDates.has(todayStr) && !watchedDates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  const cursor = watchedDates.has(todayStr) ? new Date(today) : new Date(yesterday);

  while (watchedDates.has(cursor.toISOString().split("T")[0])) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
