import { Types } from "mongoose";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Show } from "../models/show.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { WatchStatus, WatchedEpisode } from "../models/watchEntry.model.js";

export interface UpsertTrackingInput {
  status: WatchStatus;
  watchedEpisodes?: WatchedEpisode[];
  currentSeason?: number;
  currentEpisode?: number;
}

export interface TrackingListItem {
  id: string;
  showId: string;
  userId: string;
  status: WatchStatus;
  watchedEpisodes: WatchedEpisode[];
  currentSeason?: number;
  currentEpisode?: number;
  show: {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    type: "tv" | "movie";
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingListResult {
  data: TrackingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function listTracking(
  userId: string,
  page: number,
  limit: number,
  status?: WatchStatus,
): Promise<TrackingListResult> {
  const filter: { userId: Types.ObjectId; status?: WatchStatus } = {
    userId: new Types.ObjectId(userId),
  };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    WatchEntry.find(filter)
      .populate("showId", "tmdbId title type posterPath")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WatchEntry.countDocuments(filter),
  ]);

  const data = entries.map((entry): TrackingListItem => {
    const populatedShow = entry.showId as unknown as {
      _id?: string;
      tmdbId?: number;
      title?: string;
      type?: "tv" | "movie";
      posterPath?: string | null;
    };
    const showId = populatedShow._id?.toString() ?? entry.showId.toString();
    return {
      ...entry,
      id: entry._id.toString(),
      userId: entry.userId.toString(),
      showId,
      show: {
        tmdbId: populatedShow.tmdbId ?? 0,
        title: populatedShow.title ?? "Unknown",
        posterPath: populatedShow.posterPath ?? null,
        type: populatedShow.type ?? "tv",
      },
    } as TrackingListItem;
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getTrackingEntry(userId: string, showId: string) {
  const entry = await WatchEntry.findOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  }).lean();
  return entry;
}

export async function upsertTracking(
  userId: string,
  showId: string,
  input: UpsertTrackingInput,
) {
  const show = await Show.findById(showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  const watchedEpisodes = (input.watchedEpisodes || []).map((ep) => ({
    season: ep.season,
    episode: ep.episode,
    watchedAt: ep.watchedAt ? new Date(ep.watchedAt) : new Date(),
  }));

  const entry = await WatchEntry.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), showId: new Types.ObjectId(showId) },
    {
      $set: {
        status: input.status,
        watchedEpisodes,
        currentSeason: input.currentSeason,
        currentEpisode: input.currentEpisode,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return entry;
}

export async function toggleEpisode(
  userId: string,
  showId: string,
  season: number,
  episode: number,
  watched: boolean,
) {
  const show = await Show.findById(showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  let entry = await WatchEntry.findOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  });

  if (!entry) {
    entry = await WatchEntry.create({
      userId: new Types.ObjectId(userId),
      showId: new Types.ObjectId(showId),
      status: "watching",
      watchedEpisodes: [],
    });
  }

  const existingIndex = entry.watchedEpisodes.findIndex(
    (ep) => ep.season === season && ep.episode === episode,
  );

  if (watched) {
    if (existingIndex === -1) {
      entry.watchedEpisodes.push({ season, episode, watchedAt: new Date() });
    } else {
      entry.watchedEpisodes[existingIndex].watchedAt = new Date();
    }
  } else if (existingIndex !== -1) {
    entry.watchedEpisodes.splice(existingIndex, 1);
  }

  entry.updatedAt = new Date();
  await entry.save();
  return entry;
}

export async function markEpisodesUpTo(
  userId: string,
  showId: string,
  season: number,
  episode: number,
  includePrevious = true,
) {
  const show = await Show.findById(showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  let entry = await WatchEntry.findOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  });

  if (!entry) {
    entry = await WatchEntry.create({
      userId: new Types.ObjectId(userId),
      showId: new Types.ObjectId(showId),
      status: "watching",
      watchedEpisodes: [],
    });
  }

  const previousKeys = new Set(
    includePrevious
      ? show.seasons.flatMap((s) =>
          s.episodes
            .filter((e) => {
              if (s.seasonNumber < season) return true;
              if (s.seasonNumber > season) return false;
              return e.episodeNumber <= episode;
            })
            .map((e) => `${s.seasonNumber}-${e.episodeNumber}`),
        )
      : [`${season}-${episode}`],
  );

  const existingKeys = new Map(
    entry.watchedEpisodes.map((ep) => [`${ep.season}-${ep.episode}`, ep]),
  );

  const newWatchedEpisodes: WatchedEpisode[] = [];
  for (const key of previousKeys) {
    const [epSeason, epEpisode] = key.split("-").map(Number);
    const existing = existingKeys.get(key);
    newWatchedEpisodes.push(
      existing
        ? { season: existing.season, episode: existing.episode, watchedAt: existing.watchedAt }
        : { season: epSeason, episode: epEpisode, watchedAt: new Date() },
    );
  }

  entry.watchedEpisodes = newWatchedEpisodes;
  entry.currentSeason = season;
  entry.currentEpisode = episode;
  entry.updatedAt = new Date();
  await entry.save();
  return entry;
}

export async function deleteTracking(userId: string, showId: string) {
  const result = await WatchEntry.deleteOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "TRACKING_NOT_FOUND", "Tracking entry not found");
  }
}
