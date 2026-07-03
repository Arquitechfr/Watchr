import { Types } from "mongoose";
import { Rating } from "../models/rating.model.js";
import { Show } from "../models/show.model.js";
import { ApiError } from "../middleware/error.middleware.js";

export interface UpsertRatingInput {
  showId: string;
  episodeRef?: { season: number; episode: number };
  value: number;
  review?: string;
}

export async function upsertRating(userId: string, input: UpsertRatingInput) {
  const show = await Show.findById(input.showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

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

  const rating = await Rating.findOneAndUpdate(
    filter,
    {
      $set: {
        value: input.value,
        review: input.review,
      },
    },
    { new: true, upsert: true },
  );

  return rating;
}

export async function listRatingsForShow(userId: string, showId: string) {
  const show = await Show.findById(showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  const ratings = await Rating.find({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  }).sort({ createdAt: -1 });

  const showRating = ratings.find((r) => !r.episodeRef) ?? null;
  const episodeRatings = ratings
    .filter((r) => r.episodeRef)
    .map((r) => ({
      season: r.episodeRef!.season,
      episode: r.episodeRef!.episode,
      value: r.value,
    }));

  return {
    show: showRating ? showRating.value : null,
    episodes: episodeRatings,
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
