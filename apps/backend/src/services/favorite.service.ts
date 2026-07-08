import { Types } from "mongoose";
import { Favorite } from "../models/favorite.model.js";
import { Show } from "../models/show.model.js";
import { getShowTitle } from "../models/show.model.js";
import { ApiError } from "../middleware/error.middleware.js";

export interface FavoriteItem {
  id: string;
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  type: "tv" | "movie";
  createdAt: string;
}

export interface FavoritesResult {
  data: FavoriteItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function listFavorites(
  userId: string,
  type: "tv" | "movie" | undefined,
  page: number,
  limit: number,
  language = "en",
): Promise<FavoritesResult> {
  const filter: { userId: Types.ObjectId; type?: "tv" | "movie" } = {
    userId: new Types.ObjectId(userId),
  };
  if (type) {
    filter.type = type;
  }

  const total = await Favorite.countDocuments(filter);
  const favorites = await Favorite.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("showId", "tmdbId title posterPath type translations")
    .lean();

  const data: FavoriteItem[] = favorites
    .filter((fav) => fav.showId)
    .map((fav) => {
      const show = fav.showId as unknown as {
        _id: Types.ObjectId;
        tmdbId: number;
        title: string;
        posterPath?: string;
        type: "tv" | "movie";
        translations?: Map<string, { title?: string }>;
      };
      return {
        id: fav._id.toString(),
        showId: show._id.toString(),
        tmdbId: show.tmdbId,
        title: getShowTitle(show, language),
        posterPath: show.posterPath,
        type: show.type,
        createdAt: fav.createdAt.toISOString(),
      };
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

export async function addFavorite(
  userId: string,
  showId: string,
): Promise<{ id: string; showId: string }> {
  const show = await Show.findById(showId).select("type").lean();
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  const existing = await Favorite.findOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  });

  if (existing) {
    return { id: existing._id.toString(), showId };
  }

  const favorite = await Favorite.create({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
    type: show.type,
  });

  return { id: favorite._id.toString(), showId };
}

export async function removeFavorite(userId: string, showId: string): Promise<void> {
  await Favorite.deleteOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  });
}

export async function getFavoriteShowIds(userId: string): Promise<string[]> {
  const favorites = await Favorite.find({
    userId: new Types.ObjectId(userId),
  })
    .select("showId")
    .lean();

  return favorites.map((fav) => fav.showId.toString());
}
