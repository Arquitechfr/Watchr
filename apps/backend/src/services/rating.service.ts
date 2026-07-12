import { Types } from "mongoose";
import { Rating } from "../models/rating.model.js";
import { Show } from "../models/show.model.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { ApiError } from "../middleware/error.middleware.js";
import { getRedisValue, setRedisValue, invalidateRedisPattern } from "../lib/redis.js";

const DEFAULT_RATING_COOLDOWN_DAYS = 7;

async function getRatingCooldownDays(): Promise<number> {
  const entry = await MobileConfig.findOne({ key: "rating_cooldown_days" }).lean();
  if (!entry) return DEFAULT_RATING_COOLDOWN_DAYS;
  const parsed = Number(entry.value);
  return Number.isNaN(parsed) || parsed < 0 ? DEFAULT_RATING_COOLDOWN_DAYS : parsed;
}

export interface UpsertRatingInput {
  showId: string;
  episodeRef?: { season: number; episode: number };
  value: number;
  review?: string;
}

export interface CommunityRating {
  average: number;
  count: number;
}

export interface CommunityRatings {
  show: CommunityRating | null;
  episodes: Array<{ season: number; episode: number; average: number; count: number }>;
}

function normalizeValue(value: number): number {
  if (value > 5) {
    return Math.round(value / 2);
  }
  return value;
}

export async function getCommunityRatings(showId: string): Promise<CommunityRatings> {
  const cacheKey = `community-ratings:${showId}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as CommunityRatings;
    } catch {
      // Cache corrupt, proceed to compute
    }
  }

  const show = await Show.findById(showId).lean();
  if (!show) {
    return { show: null, episodes: [] };
  }

  const tmdbAvg = show.voteAverage ? show.voteAverage / 2 : null;
  const tmdbCount = show.voteCount ?? 0;

  const [showAgg, episodeAgg] = await Promise.all([
    Rating.aggregate<{
      _id: null;
      average: number;
      count: number;
    }>([
      { $match: { showId: new Types.ObjectId(showId), episodeRef: { $exists: false } } },
      { $group: { _id: null, average: { $avg: "$value" }, count: { $sum: 1 } } },
    ]),
    Rating.aggregate<{
      _id: { season: number; episode: number };
      average: number;
      count: number;
    }>([
      { $match: { showId: new Types.ObjectId(showId), episodeRef: { $exists: true } } },
      {
        $group: {
          _id: { season: "$episodeRef.season", episode: "$episodeRef.episode" },
          average: { $avg: "$value" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  let communityShow: CommunityRating | null = null;
  if (showAgg.length > 0) {
    const watchrAvg = showAgg[0].average;
    const watchrCount = showAgg[0].count;
    if (tmdbAvg !== null && tmdbCount > 0) {
      const combinedAvg = (watchrAvg * watchrCount + tmdbAvg * tmdbCount) / (watchrCount + tmdbCount);
      communityShow = { average: Math.round(combinedAvg * 10) / 10, count: watchrCount + tmdbCount };
    } else {
      communityShow = { average: Math.round(watchrAvg * 10) / 10, count: watchrCount };
    }
  } else if (tmdbAvg !== null && tmdbCount > 0) {
    communityShow = { average: Math.round(tmdbAvg * 10) / 10, count: tmdbCount };
  }

  const communityEpisodes = episodeAgg.map((e) => ({
    season: e._id.season,
    episode: e._id.episode,
    average: Math.round(e.average * 10) / 10,
    count: e.count,
  }));

  const result = { show: communityShow, episodes: communityEpisodes };
  await setRedisValue(cacheKey, JSON.stringify(result), 60);
  return result;
}

export async function upsertRating(userId: string, input: UpsertRatingInput) {
  const show = await Show.findById(input.showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  const normalizedValue = normalizeValue(input.value);

  const filter: {
    userId: Types.ObjectId;
    showId: Types.ObjectId;
    episodeRef?: { season: number; episode: number };
  } = {
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(input.showId),
  };

  if (input.episodeRef) {
    filter.episodeRef = input.episodeRef;
  } else {
    filter.episodeRef = { $exists: false } as unknown as { season: number; episode: number };
  }

  const existing = await Rating.findOne(filter).lean();
  if (existing) {
    const cooldownDays = await getRatingCooldownDays();
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - existing.updatedAt.getTime();
    if (elapsed < cooldownMs) {
      const remainingDays = Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000));
      throw new ApiError(
        429,
        "RATING_COOLDOWN",
        `You can rate this again in ${remainingDays} day(s).`,
        undefined,
        { days: remainingDays },
      );
    }
  }

  const rating = await Rating.findOneAndUpdate(
    filter,
    {
      $set: {
        value: normalizedValue,
        review: input.review,
      },
    },
    { new: true, upsert: true },
  );

  await invalidateRedisPattern(`community-ratings:${input.showId}`);
  const community = await getCommunityRatings(input.showId);

  import("./admin/adminFeedNotification.service.js")
    .then(({ createNotification }) =>
      createNotification({
        type: "new_rating",
        title: "New rating submitted",
        message: `User rated a show ${normalizedValue}/5${input.episodeRef ? ` (S${input.episodeRef.season}E${input.episodeRef.episode})` : ""}.`,
        severity: "info",
        metadata: {
          refId: rating._id.toString(),
          refType: "rating",
          userId,
          showId: input.showId,
        },
      }),
    )
    .catch(() => {});

  return { rating, community };
}

export async function listRatingsForShow(userId: string, showId: string) {
  const show = await Show.findById(showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  const [ratings, community] = await Promise.all([
    Rating.find({
      userId: new Types.ObjectId(userId),
      showId: new Types.ObjectId(showId),
    }).sort({ createdAt: -1 }),
    getCommunityRatings(showId),
  ]);

  const showRating = ratings.find((r) => !r.episodeRef) ?? null;
  const episodeRatings = ratings
    .filter((r) => r.episodeRef)
    .map((r) => ({
      season: r.episodeRef!.season,
      episode: r.episodeRef!.episode,
      value: r.value,
    }));

  return {
    user: {
      show: showRating ? showRating.value : null,
      episodes: episodeRatings,
    },
    community,
  };
}

export async function deleteRating(userId: string, ratingId: string) {
  const result = await Rating.deleteOne({
    _id: new Types.ObjectId(ratingId),
    userId: new Types.ObjectId(userId),
  });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "RATING_NOT_FOUND", "Rating not found");
  }
}
