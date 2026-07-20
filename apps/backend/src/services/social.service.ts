import { Types } from "mongoose";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import { Rating } from "../models/rating.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { SupportedLocale } from "../i18n/translations.js";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface FollowStatusResult {
  isFollowing: boolean;
}

export interface FollowCountsResult {
  followers: number;
  following: number;
}

export interface FollowUserItem {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PublicProfileResult {
  id: string;
  username: string;
  avatarUrl?: string;
  bannerUrl?: string;
  createdAt: string;
  activityVisibility: "private" | "public";
  isFollowing: boolean;
  isMutualFriend: boolean;
  followers: number;
  following: number;
  bio?: string;
  translatedBio?: string;
  isBioTranslated?: boolean;
  favoriteGenres?: string[];
}

export type ActivityFeedItemType = "rating" | "watchlist_add" | "comment";

export interface ActivityFeedItem {
  type: ActivityFeedItemType;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  show: {
    tmdbId: number;
    title: string;
    posterPath?: string;
    type: "tv" | "movie";
  };
  createdAt: string;
  rating?: { value: number };
  comment?: { content: string; commentId: string };
  watchlistAdd?: { count: number; titles: string[] };
}

export interface ActivityFeedResult {
  data: ActivityFeedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function followUser(
  followerId: string,
  targetUserId: string,
): Promise<FollowStatusResult> {
  if (followerId === targetUserId) {
    throw new ApiError(400, "SELF_FOLLOW", "You cannot follow yourself");
  }

  const targetUser = await User.findById(targetUserId).select("isBanned").lean();
  if (!targetUser) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  if (targetUser.isBanned) {
    throw new ApiError(403, "USER_BANNED", "This user has been banned");
  }

  try {
    await Follow.create({
      followerId: new Types.ObjectId(followerId),
      followingId: new Types.ObjectId(targetUserId),
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      // Duplicate key — already following, idempotent
    } else {
      throw err;
    }
  }

  return { isFollowing: true };
}

export async function unfollowUser(
  followerId: string,
  targetUserId: string,
): Promise<void> {
  await Follow.deleteOne({
    followerId: new Types.ObjectId(followerId),
    followingId: new Types.ObjectId(targetUserId),
  });
}

export async function getFollowStatus(
  followerId: string,
  targetUserId: string,
): Promise<FollowStatusResult> {
  const doc = await Follow.findOne({
    followerId: new Types.ObjectId(followerId),
    followingId: new Types.ObjectId(targetUserId),
  })
    .select("_id")
    .lean();
  return { isFollowing: !!doc };
}

export async function getFollowCounts(userId: string): Promise<FollowCountsResult> {
  const [followers, following] = await Promise.all([
    Follow.countDocuments({ followingId: new Types.ObjectId(userId) }),
    Follow.countDocuments({ followerId: new Types.ObjectId(userId) }),
  ]);
  return { followers, following };
}

export async function listFollowers(
  userId: string,
  page: number,
  limit: number,
): Promise<PaginatedResult<FollowUserItem>> {
  const [docs, total] = await Promise.all([
    Follow.find({ followingId: new Types.ObjectId(userId) })
      .populate("followerId", "username avatarUrl")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Follow.countDocuments({ followingId: new Types.ObjectId(userId) }),
  ]);

  return {
    data: docs.map((d) => {
      const user = d.followerId as unknown as { _id: Types.ObjectId; username: string; avatarUrl?: string };
      return {
        id: user._id.toString(),
        username: user.username,
        avatarUrl: user.avatarUrl,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}

export async function listFollowing(
  userId: string,
  page: number,
  limit: number,
): Promise<PaginatedResult<FollowUserItem>> {
  const [docs, total] = await Promise.all([
    Follow.find({ followerId: new Types.ObjectId(userId) })
      .populate("followingId", "username avatarUrl")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Follow.countDocuments({ followerId: new Types.ObjectId(userId) }),
  ]);

  return {
    data: docs.map((d) => {
      const user = d.followingId as unknown as { _id: Types.ObjectId; username: string; avatarUrl?: string };
      return {
        id: user._id.toString(),
        username: user.username,
        avatarUrl: user.avatarUrl,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}

export async function updateActivityVisibility(
  userId: string,
  visibility: "private" | "public",
): Promise<{ activityVisibility: "private" | "public" }> {
  await User.findByIdAndUpdate(userId, { activityVisibility: visibility });
  return { activityVisibility: visibility };
}

export async function getPublicProfile(
  username: string,
  requestingUserId: string,
  locale: SupportedLocale = "en",
): Promise<PublicProfileResult> {
  const user = await User.findOne({ username })
    .select("username avatarUrl bannerUrl createdAt activityVisibility isBanned bio bioTranslations bioOriginalLanguage favoriteGenres")
    .lean();

  if (!user || user.isBanned) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  const [isFollowingDoc, isFollowedByDoc, counts] = await Promise.all([
    Follow.findOne({
      followerId: new Types.ObjectId(requestingUserId),
      followingId: user._id,
    })
      .select("_id")
      .lean(),
    Follow.findOne({
      followerId: user._id,
      followingId: new Types.ObjectId(requestingUserId),
    })
      .select("_id")
      .lean(),
    getFollowCounts(user._id.toString()),
  ]);

  const bio = user.bio ?? "";
  const bioTranslations = user.bioTranslations as Record<string, string> | undefined;
  const translatedBio = bioTranslations?.[locale] ?? null;
  const isBioTranslated = translatedBio !== null && translatedBio !== bio;

  return {
    id: user._id.toString(),
    username: user.username,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    createdAt: user.createdAt.toISOString(),
    activityVisibility: user.activityVisibility ?? "private",
    isFollowing: !!isFollowingDoc,
    isMutualFriend: !!isFollowingDoc && !!isFollowedByDoc,
    followers: counts.followers,
    following: counts.following,
    bio,
    translatedBio: isBioTranslated ? translatedBio! : undefined,
    isBioTranslated,
    favoriteGenres: user.favoriteGenres ?? [],
  };
}

export async function searchUsers(
  query: string,
  requestingUserId: string,
  page: number,
  limit: number,
): Promise<PaginatedResult<FollowUserItem>> {
  const filter = {
    username: { $regex: `^${escapeRegex(query)}`, $options: "i" },
    isBanned: false,
    _id: { $ne: new Types.ObjectId(requestingUserId) },
  };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("username avatarUrl")
      .sort({ username: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    data: users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      avatarUrl: u.avatarUrl,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}

interface RawActivityItem {
  type: ActivityFeedItemType;
  createdAt: Date;
  userId: Types.ObjectId;
  username: string;
  avatarUrl?: string;
  showId: Types.ObjectId;
  tmdbId: number;
  title: string;
  posterPath?: string;
  showType: "tv" | "movie";
  ratingValue?: number;
  commentId?: string;
  content?: string;
}

function groupWatchEntriesByTimeWindow(
  entries: RawActivityItem[],
  windowMs: number,
): RawActivityItem[] {
  const groups = new Map<string, RawActivityItem[]>();

  for (const entry of entries) {
    const bucketTime = Math.floor(entry.createdAt.getTime() / windowMs) * windowMs;
    const key = `${entry.userId.toString()}:${bucketTime}`;
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  const result: RawActivityItem[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      const first = group[0];
      result.push({
        ...first,
        type: "watchlist_add",
        createdAt: first.createdAt,
        watchlistCount: group.length,
        watchlistTitles: group.map((g) => g.title).slice(0, 3),
      } as RawActivityItem & { watchlistCount: number; watchlistTitles: string[] });
    }
  }

  return result;
}

export async function getFriendsActivityFeed(
  userId: string,
  page: number,
  limit: number,
): Promise<ActivityFeedResult> {
  const followingDocs = await Follow.find({
    followerId: new Types.ObjectId(userId),
  })
    .select("followingId")
    .lean();

  const followingIds = followingDocs.map((d) => d.followingId);
  if (followingIds.length === 0) {
    return {
      data: [],
      pagination: { page, limit, total: 0, pages: 0 },
    };
  }

  const publicUsers = await User.find({
    _id: { $in: followingIds },
    activityVisibility: "public",
    isBanned: false,
  })
    .select("_id")
    .lean();

  const publicFollowingIds = publicUsers.map((u) => u._id);
  if (publicFollowingIds.length === 0) {
    return {
      data: [],
      pagination: { page, limit, total: 0, pages: 0 },
    };
  }

  const [ratings, watchEntries, comments] = await Promise.all([
    Rating.find({ userId: { $in: publicFollowingIds } })
      .populate("userId", "username avatarUrl")
      .populate("showId", "tmdbId title posterPath type")
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean(),
    WatchEntry.find({
      userId: { $in: publicFollowingIds },
      status: { $in: ["plan_to_watch", "watching"] },
    })
      .populate("userId", "username avatarUrl")
      .populate("showId", "tmdbId title posterPath type")
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean(),
    Comment.find({
      userId: { $in: publicFollowingIds },
      isSpoiler: false,
      isHidden: false,
    })
      .populate("userId", "username avatarUrl")
      .populate("showId", "tmdbId title posterPath type")
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean(),
  ]);

  const rawItems: RawActivityItem[] = [];

  for (const r of ratings) {
    const user = r.userId as unknown as { _id: Types.ObjectId; username: string; avatarUrl?: string } | null;
    const show = r.showId as unknown as { _id: Types.ObjectId; tmdbId: number; title: string; posterPath?: string; type: "tv" | "movie" } | null;
    if (!user || !show) continue;
    rawItems.push({
      type: "rating",
      createdAt: r.createdAt,
      userId: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      showId: show._id,
      tmdbId: show.tmdbId,
      title: show.title,
      posterPath: show.posterPath,
      showType: show.type,
      ratingValue: r.value,
    });
  }

  const watchlistItems: RawActivityItem[] = [];
  for (const w of watchEntries) {
    const user = w.userId as unknown as { _id: Types.ObjectId; username: string; avatarUrl?: string } | null;
    const show = w.showId as unknown as { _id: Types.ObjectId; tmdbId: number; title: string; posterPath?: string; type: "tv" | "movie" } | null;
    if (!user || !show) continue;
    watchlistItems.push({
      type: "watchlist_add",
      createdAt: w.createdAt,
      userId: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      showId: show._id,
      tmdbId: show.tmdbId,
      title: show.title,
      posterPath: show.posterPath,
      showType: show.type,
    });
  }

  const groupedWatchlist = groupWatchEntriesByTimeWindow(watchlistItems, 5 * 60 * 1000);
  rawItems.push(...groupedWatchlist);

  for (const c of comments) {
    const user = c.userId as unknown as { _id: Types.ObjectId; username: string; avatarUrl?: string } | null;
    const show = c.showId as unknown as { _id: Types.ObjectId; tmdbId: number; title: string; posterPath?: string; type: "tv" | "movie" } | null;
    if (!user || !show) continue;
    rawItems.push({
      type: "comment",
      createdAt: c.createdAt,
      userId: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      showId: show._id,
      tmdbId: show.tmdbId,
      title: show.title,
      posterPath: show.posterPath,
      showType: show.type,
      commentId: c._id.toString(),
      content: c.content,
    });
  }

  rawItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = rawItems.length;
  const start = (page - 1) * limit;
  const paged = rawItems.slice(start, start + limit);

  const data: ActivityFeedItem[] = paged.map((item) => {
    const base = {
      type: item.type,
      user: {
        id: item.userId.toString(),
        username: item.username,
        avatarUrl: item.avatarUrl,
      },
      show: {
        tmdbId: item.tmdbId,
        title: item.title,
        posterPath: item.posterPath,
        type: item.showType,
      },
      createdAt: item.createdAt.toISOString(),
    };

    if (item.type === "rating" && item.ratingValue !== undefined) {
      return { ...base, rating: { value: item.ratingValue } };
    }

    if (item.type === "comment" && item.content !== undefined && item.commentId !== undefined) {
      return { ...base, comment: { content: item.content, commentId: item.commentId } };
    }

    if (item.type === "watchlist_add") {
      const grouped = item as RawActivityItem & { watchlistCount?: number; watchlistTitles?: string[] };
      if (grouped.watchlistCount && grouped.watchlistCount > 1) {
        return {
          ...base,
          watchlistAdd: {
            count: grouped.watchlistCount,
            titles: grouped.watchlistTitles ?? [],
          },
        };
      }
      return { ...base, watchlistAdd: { count: 1, titles: [item.title] } };
    }

    return base as ActivityFeedItem;
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}
