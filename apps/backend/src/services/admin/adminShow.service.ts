import { Show } from "../../models/show.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { refreshShowFromTmdb } from "../cacheShow.service.js";

export interface ListShowsQuery {
  type?: "tv" | "movie";
  search?: string;
  page: number;
  limit: number;
}

export async function listShows(query: ListShowsQuery) {
  const { type, search, page, limit } = query;

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
    ];
  }

  const [shows, total] = await Promise.all([
    Show.find(filter)
      .select("tmdbId type title posterPath createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Show.countDocuments(filter),
  ]);

  return {
    shows: shows.map((s) => ({
      id: s._id.toString(),
      tmdbId: s.tmdbId,
      type: s.type,
      title: s.title,
      posterPath: s.posterPath,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function forceSyncShow(tmdbId: number, _type: "tv" | "movie") {
  const show = await refreshShowFromTmdb(tmdbId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found on TMDB");
  }
  return {
    id: show._id.toString(),
    tmdbId: show.tmdbId,
    title: show.title,
    synced: true,
  };
}

export async function deleteShow(showId: string): Promise<void> {
  const result = await Show.deleteOne({ _id: showId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }
}
