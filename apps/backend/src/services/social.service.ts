import { Types, type PipelineStage } from "mongoose";
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
  const user = await User.findOne({
    username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  })
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

export async function getFriendsActivityFeed(
  userId: string,
  page: number,
  limit: number,
  types?: string[],
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

  const validTypes = types?.filter((t) => ["rating", "watchlist_add", "comment"].includes(t)) ?? [];
  const includeRatings = validTypes.length === 0 || validTypes.includes("rating");
  const includeWatchlist = validTypes.length === 0 || validTypes.includes("watchlist_add");
  const includeComments = validTypes.length === 0 || validTypes.includes("comment");

  const skip = (page - 1) * limit;

  const facetStages: Record<string, unknown[]> = {};
  if (includeRatings) {
    facetStages.ratings = [
      { $match: { userId: { $in: publicFollowingIds } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDoc",
          pipeline: [{ $project: { username: 1, avatarUrl: 1 } }],
        },
      },
      { $unwind: "$userDoc" },
      {
        $lookup: {
          from: "shows",
          localField: "showId",
          foreignField: "_id",
          as: "showDoc",
          pipeline: [{ $project: { tmdbId: 1, title: 1, posterPath: 1, type: 1 } }],
        },
      },
      { $unwind: "$showDoc" },
      {
        $project: {
          type: { $literal: "rating" },
          createdAt: 1,
          userId: 1,
          username: "$userDoc.username",
          avatarUrl: "$userDoc.avatarUrl",
          showId: 1,
          tmdbId: "$showDoc.tmdbId",
          title: "$showDoc.title",
          posterPath: "$showDoc.posterPath",
          showType: "$showDoc.type",
          ratingValue: "$value",
        },
      },
    ];
  }
  if (includeWatchlist) {
    facetStages.watchlist = [
      { $match: { userId: { $in: publicFollowingIds }, status: { $in: ["plan_to_watch", "watching"] } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDoc",
          pipeline: [{ $project: { username: 1, avatarUrl: 1 } }],
        },
      },
      { $unwind: "$userDoc" },
      {
        $lookup: {
          from: "shows",
          localField: "showId",
          foreignField: "_id",
          as: "showDoc",
          pipeline: [{ $project: { tmdbId: 1, title: 1, posterPath: 1, type: 1 } }],
        },
      },
      { $unwind: "$showDoc" },
      {
        $project: {
          type: { $literal: "watchlist_add" },
          createdAt: 1,
          userId: 1,
          username: "$userDoc.username",
          avatarUrl: "$userDoc.avatarUrl",
          showId: 1,
          tmdbId: "$showDoc.tmdbId",
          title: "$showDoc.title",
          posterPath: "$showDoc.posterPath",
          showType: "$showDoc.type",
        },
      },
    ];
  }
  if (includeComments) {
    facetStages.comments = [
      { $match: { userId: { $in: publicFollowingIds }, isSpoiler: false, isHidden: false } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDoc",
          pipeline: [{ $project: { username: 1, avatarUrl: 1 } }],
        },
      },
      { $unwind: "$userDoc" },
      {
        $lookup: {
          from: "shows",
          localField: "showId",
          foreignField: "_id",
          as: "showDoc",
          pipeline: [{ $project: { tmdbId: 1, title: 1, posterPath: 1, type: 1 } }],
        },
      },
      { $unwind: "$showDoc" },
      {
        $project: {
          type: { $literal: "comment" },
          createdAt: 1,
          userId: 1,
          username: "$userDoc.username",
          avatarUrl: "$userDoc.avatarUrl",
          showId: 1,
          tmdbId: "$showDoc.tmdbId",
          title: "$showDoc.title",
          posterPath: "$showDoc.posterPath",
          showType: "$showDoc.type",
          commentId: { $toString: "$_id" },
          content: 1,
        },
      },
    ];
  }

  const concatArrays: string[] = [];
  if (includeRatings) concatArrays.push("$ratings");
  if (includeWatchlist) concatArrays.push("$watchlist");
  if (includeComments) concatArrays.push("$comments");

  const pipeline = [
    { $facet: facetStages },
    {
      $project: {
        allItems: { $concatArrays: concatArrays },
      },
    },
    { $unwind: "$allItems" },
    { $replaceRoot: { newRoot: "$allItems" } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
  ];

  const [ratingsCount, watchlistCount, commentsCount] = await Promise.all([
    Rating.countDocuments({ userId: { $in: publicFollowingIds } }),
    WatchEntry.countDocuments({ userId: { $in: publicFollowingIds }, status: { $in: ["plan_to_watch", "watching"] } }),
    Comment.countDocuments({ userId: { $in: publicFollowingIds }, isSpoiler: false, isHidden: false }),
  ]);

  const results = await Rating.aggregate(pipeline as PipelineStage[]);

  const rawItems: RawActivityItem[] = results.map((r: Record<string, unknown>) => ({
    type: r.type as RawActivityItem["type"],
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string | number),
    userId: r.userId as Types.ObjectId,
    username: r.username as string,
    avatarUrl: r.avatarUrl as string | undefined,
    showId: r.showId as Types.ObjectId,
    tmdbId: r.tmdbId as number,
    title: r.title as string,
    posterPath: r.posterPath as string | undefined,
    showType: r.showType as "tv" | "movie",
    ratingValue: r.ratingValue as number | undefined,
    commentId: r.commentId as string | undefined,
    content: r.content as string | undefined,
  }));

  const data: ActivityFeedItem[] = rawItems.map((item) => {
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
      return { ...base, watchlistAdd: { count: 1, titles: [item.title] } };
    }

    return base as ActivityFeedItem;
  });

  const total = ratingsCount + watchlistCount + commentsCount;

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
