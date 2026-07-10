import { Types } from "mongoose";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Show } from "../models/show.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { WatchStatus, WatchedEpisode } from "../models/watchEntry.model.js";
import { getShowDetails } from "./show.service.js";
import { getTranslationValue, ShowTranslation, Season } from "../models/show.model.js";
import { log } from "../lib/logger.js";
import { wsEvents } from "../lib/wsEvents.js";
import { getAiredEpisodeCount, getAiredWatchedCount } from "../lib/episodeUtils.js";
import { getRedisValue, setRedisValue, deleteRedisKey } from "../lib/redis.js";
import { invalidateUpcomingCache } from "./upcoming.service.js";

function isShowEnded(status?: string): boolean {
  return ["ended", "canceled", "cancelled"].includes(status?.toLowerCase() ?? "");
}

function calculateWatchStatus(
  show: {
    type?: "tv" | "movie";
    status?: string;
    seasons?: Season[];
  },
  entry: { status?: WatchStatus; watchedEpisodes: WatchedEpisode[] },
): WatchStatus {
  if (entry.status === "dropped") return "dropped";

  if (show.type !== "tv") {
    if (entry.status === "completed") return "completed";
    return entry.watchedEpisodes.length > 0 ? "completed" : "plan_to_watch";
  }

  // Filter out seasons with no episodes (e.g., upcoming seasons not yet aired)
  const seasonsWithEpisodes = (show.seasons ?? []).filter(
    (season) => season.episodes && season.episodes.length > 0
  );

  const totalEpisodes = seasonsWithEpisodes.reduce(
    (sum, season) => sum + (season.episodes?.length ?? 0),
    0,
  );
  const watchedCount = entry.watchedEpisodes.length;
  const allWatched = totalEpisodes > 0 && watchedCount >= totalEpisodes;
  const showEnded = isShowEnded(show.status);

  if (allWatched && showEnded) return "completed";
  if (watchedCount > 0) return "watching";
  return "plan_to_watch";
}

export interface UpsertTrackingInput {
  status?: WatchStatus;
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
    totalEpisodes?: number;
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
  language = "en",
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
      .populate("showId", "tmdbId title type posterPath status seasons translations")
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
      status?: string;
      seasons?: Season[];
      translations?: Map<string, ShowTranslation> | Record<string, ShowTranslation>;
    };
    const showId = populatedShow._id?.toString() ?? entry.showId.toString();
    const status = entry.status;
    const translation = getTranslationValue(populatedShow.translations, language);
    const title = translation?.title ?? populatedShow.title ?? "Unknown";
    return {
      ...entry,
      id: entry._id.toString(),
      userId: entry.userId.toString(),
      showId,
      status,
      show: {
        tmdbId: populatedShow.tmdbId ?? 0,
        title,
        posterPath: populatedShow.posterPath ?? null,
        type: populatedShow.type ?? "tv",
        totalEpisodes: getAiredEpisodeCount(populatedShow.seasons ?? []),
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

export async function listLibrary(
  userId: string,
  page: number,
  limit: number,
  type?: "tv" | "movie",
  language = "en",
): Promise<TrackingListResult> {
  const skip = (page - 1) * limit;

  const matchStage: any = {
    userId: new Types.ObjectId(userId),
  };

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: "shows",
        localField: "showId",
        foreignField: "_id",
        as: "show",
      },
    },
    { $unwind: "$show" },
  ];

  if (type) {
    pipeline.push({ $match: { "show.type": type } });
  }

  pipeline.push(
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  );

  const [entries, totalResult] = await Promise.all([
    WatchEntry.aggregate(pipeline),
    WatchEntry.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "shows",
          localField: "showId",
          foreignField: "_id",
          as: "show",
        },
      },
      { $unwind: "$show" },
      ...(type ? [{ $match: { "show.type": type } }] : []),
      { $count: "total" },
    ]),
  ]);

  const total = totalResult[0]?.total || 0;

  const data = entries.map((entry: any): TrackingListItem => {
    const show = entry.show as {
      _id?: string;
      tmdbId?: number;
      title?: string;
      type?: "tv" | "movie";
      posterPath?: string | null;
      status?: string;
      seasons?: Season[];
      translations?: Map<string, ShowTranslation> | Record<string, ShowTranslation>;
    };

    const showId = show._id?.toString() ?? entry.showId.toString();
    const status = entry.status;
    const translation = getTranslationValue(show.translations, language);
    const title = translation?.title ?? show.title ?? "Unknown";
    return {
      ...entry,
      id: entry._id.toString(),
      userId: entry.userId.toString(),
      showId,
      status,
      show: {
        tmdbId: show.tmdbId ?? 0,
        title,
        posterPath: show.posterPath ?? null,
        type: show.type ?? "tv",
        totalEpisodes: getAiredEpisodeCount(show.seasons ?? []),
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

export interface TrackingEntry {
  id: string;
  userId: string;
  showId: string;
  status: WatchStatus;
  watchedEpisodes: WatchedEpisode[];
  currentSeason?: number;
  currentEpisode?: number;
  totalEpisodes?: number;
  watchedCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTrackingEntry(userId: string, showId: string): Promise<TrackingEntry | null> {
  const entry = await WatchEntry.findOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  })
    .populate("showId", "type status seasons")
    .lean();
  if (!entry) return null;

  const populatedShow = entry.showId as unknown as {
    type?: "tv" | "movie";
    status?: string;
    seasons?: Season[];
  };
  const status = entry.status;
  const totalEpisodes = getAiredEpisodeCount(populatedShow.seasons ?? []);
  const watchedCount = getAiredWatchedCount(entry.watchedEpisodes, populatedShow.seasons ?? []);
  return {
    id: entry._id.toString(),
    userId: entry.userId.toString(),
    showId: entry.showId.toString(),
    status,
    watchedEpisodes: entry.watchedEpisodes,
    currentSeason: entry.currentSeason,
    currentEpisode: entry.currentEpisode,
    totalEpisodes,
    watchedCount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  } as TrackingEntry;
}

export async function addToWatchlistByTmdb(
  userId: string,
  tmdbId: number,
  type: "tv" | "movie",
  language = "en",
) {
  log("TrackingService", "addToWatchlistByTmdb start", { tmdbId, type, language });

  let show = await Show.findOne({ tmdbId });
  if (!show) {
    log("TrackingService", "show not cached, fetching details", { tmdbId, language });
    await getShowDetails(tmdbId, language);
    show = await Show.findOne({ tmdbId });
  }

  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found after sync");
  }

  const existing = await WatchEntry.findOne({
    userId: new Types.ObjectId(userId),
    showId: show._id,
  }).lean();

  if (existing) {
    log("TrackingService", "watchlist entry already exists", { tmdbId });
    return existing;
  }

  const entry = await WatchEntry.create({
    userId: new Types.ObjectId(userId),
    showId: show._id,
    status: "plan_to_watch" as WatchStatus,
    watchedEpisodes: [],
  });

  log("TrackingService", "watchlist entry created", { tmdbId, showId: show._id.toString() });
  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId: show._id.toString() });
  return entry;
}

export async function addToWatchlistBatch(
  userId: string,
  items: { tmdbId: number; type: "tv" | "movie" }[],
  language = "en",
): Promise<{ added: number; failed: number; failedIds: string[] }> {
  log("TrackingService", "addToWatchlistBatch start", { userId, itemCount: items.length });

  const results = await Promise.allSettled(
    items.map((item) => addToWatchlistByTmdb(userId, item.tmdbId, item.type, language)),
  );

  let added = 0;
  let failed = 0;
  const failedIds: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      added++;
    } else {
      failed++;
      failedIds.push(String(items[index].tmdbId));
      log("TrackingService", "batch item failed", {
        tmdbId: items[index].tmdbId,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  log("TrackingService", "addToWatchlistBatch done", { added, failed });
  return { added, failed, failedIds };
}

export async function getTrackedTmdbIds(userId: string): Promise<number[]> {
  log("TrackingService", "getTrackedTmdbIds start", { userId });

  const entries = await WatchEntry.find({
    userId: new Types.ObjectId(userId),
  })
    .populate("showId", "tmdbId")
    .lean();

  const tmdbIds = entries
    .map((entry) => {
      const populatedShow = entry.showId as unknown as { tmdbId?: number };
      return populatedShow.tmdbId ?? 0;
    })
    .filter((tmdbId) => tmdbId > 0);

  log("TrackingService", "getTrackedTmdbIds result", { count: tmdbIds.length });
  return tmdbIds;
}

export async function getTrackedShowTitles(userId: string): Promise<string[]> {
  log("TrackingService", "getTrackedShowTitles start", { userId });

  const entries = await WatchEntry.find({
    userId: new Types.ObjectId(userId),
  })
    .populate("showId", "title translations")
    .lean();

  const titles = entries
    .map((entry) => {
      const show = entry.showId as unknown as { title?: string; translations?: Record<string, { title?: string }> };
      return show?.title ?? "";
    })
    .filter((title) => title.length > 0);

  log("TrackingService", "getTrackedShowTitles result", { count: titles.length });
  return titles;
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

  const existing = await WatchEntry.findOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  }).lean();

  // Use provided status if available, otherwise calculate it
  const status = input.status || calculateWatchStatus(show, {
    status: existing?.status === "dropped" ? "dropped" : undefined,
    watchedEpisodes,
  });

  const entry = await WatchEntry.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), showId: new Types.ObjectId(showId) },
    {
      $set: {
        status,
        watchedEpisodes,
        currentSeason: input.currentSeason,
        currentEpisode: input.currentEpisode,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
  return entry;
}

export async function upsertWithProgress(
  userId: string,
  showId: string,
  input: {
    status?: WatchStatus;
    currentSeason?: number;
    currentEpisode?: number;
    markUpTo?: { season: number; episode: number; includePrevious: boolean };
  },
) {
  const show = await Show.findById(showId);
  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  const existing = await WatchEntry.findOne({
    userId: new Types.ObjectId(userId),
    showId: new Types.ObjectId(showId),
  }).lean();

  const status = input.status || calculateWatchStatus(show, {
    status: existing?.status === "dropped" ? "dropped" : undefined,
    watchedEpisodes: existing?.watchedEpisodes ?? [],
  });

  let watchedEpisodes = existing?.watchedEpisodes ?? [];

  if (input.markUpTo) {
    const { season, episode, includePrevious } = input.markUpTo;
    const watchedKeys = new Set(watchedEpisodes.map((ep) => `${ep.season}-${ep.episode}`));
    const toAdd: WatchedEpisode[] = [];

    for (const s of show.seasons ?? []) {
      for (const ep of s.episodes ?? []) {
        if (!ep.airDate || ep.airDate > new Date()) continue;
        if (includePrevious) {
          if (s.seasonNumber < season || (s.seasonNumber === season && ep.episodeNumber <= episode)) {
            const key = `${s.seasonNumber}-${ep.episodeNumber}`;
            if (!watchedKeys.has(key)) {
              toAdd.push({ season: s.seasonNumber, episode: ep.episodeNumber, watchedAt: new Date() });
            }
          }
        } else {
          if (s.seasonNumber === season && ep.episodeNumber === episode) {
            const key = `${s.seasonNumber}-${ep.episodeNumber}`;
            if (!watchedKeys.has(key)) {
              toAdd.push({ season: s.seasonNumber, episode: ep.episodeNumber, watchedAt: new Date() });
            }
          }
        }
      }
    }
    watchedEpisodes = [...watchedEpisodes, ...toAdd];
  }

  if (input.markUpTo && existing?.status !== "dropped") {
    const newStatus = calculateWatchStatus(show, { watchedEpisodes });
    if (newStatus !== "plan_to_watch") {
      watchedEpisodes = watchedEpisodes;
    }
  }

  const finalStatus = input.markUpTo && existing?.status !== "dropped"
    ? calculateWatchStatus(show, { watchedEpisodes })
    : status;

  const entry = await WatchEntry.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), showId: new Types.ObjectId(showId) },
    {
      $set: {
        status: finalStatus,
        watchedEpisodes,
        currentSeason: input.currentSeason ?? input.markUpTo?.season,
        currentEpisode: input.currentEpisode ?? input.markUpTo?.episode,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
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
  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
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
  if (entry.status !== "dropped") {
    entry.status = calculateWatchStatus(show, entry);
  }
  await entry.save();
  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
  return entry;
}

export async function markAllAiredEpisodes(
  userId: string,
  showId: string,
  season?: number,
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

  const now = new Date();
  const airedKeys = new Set<string>();
  for (const s of show.seasons) {
    if (season !== undefined && s.seasonNumber !== season) continue;
    if (s.seasonNumber === 0) continue;
    for (const e of s.episodes) {
      if (e.airDate && new Date(e.airDate) <= now) {
        airedKeys.add(`${s.seasonNumber}-${e.episodeNumber}`);
      }
    }
  }

  const existingMap = new Map(
    entry.watchedEpisodes.map((ep) => [`${ep.season}-${ep.episode}`, ep]),
  );

  const newWatchedEpisodes: WatchedEpisode[] = [];
  for (const ep of entry.watchedEpisodes) {
    newWatchedEpisodes.push({ season: ep.season, episode: ep.episode, watchedAt: ep.watchedAt });
  }

  for (const key of airedKeys) {
    if (existingMap.has(key)) continue;
    const [epSeason, epEpisode] = key.split("-").map(Number);
    newWatchedEpisodes.push({ season: epSeason, episode: epEpisode, watchedAt: new Date() });
  }

  entry.watchedEpisodes = newWatchedEpisodes;
  entry.updatedAt = new Date();
  if (entry.status !== "dropped") {
    entry.status = calculateWatchStatus(show, entry);
  }
  await entry.save();
  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
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
  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
}

export async function unmarkSeasonEpisodes(
  userId: string,
  showId: string,
  season: number,
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
      status: "plan_to_watch",
      watchedEpisodes: [],
    });
  }

  entry.watchedEpisodes = entry.watchedEpisodes.filter(
    (ep) => ep.season !== season,
  );
  entry.updatedAt = new Date();
  if (entry.status !== "dropped") {
    entry.status = calculateWatchStatus(show, entry);
  }
  await entry.save();
  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
  return entry;
}

export interface UnwatchedEpisode {
  season: number;
  episode: number;
  name?: string;
  airDate?: string;
}

export interface UnwatchedShow {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: "tv";
  status: WatchStatus;
  isEnded: boolean;
  unwatchedEpisodes: UnwatchedEpisode[];
  watchedCount: number;
  totalEpisodes: number;
  network?: string;
}

export interface UnwatchedMovie {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  status: WatchStatus;
  type: "movie";
  genres?: Array<{ id: number; name?: string }>;
  year?: number;
}

export type UnwatchedResult = { shows: UnwatchedShow[] } | { movies: UnwatchedMovie[] };

async function invalidateUnwatchedCache(userId: string): Promise<void> {
  const patterns = [
    `unwatched:${userId}:all:en`,
    `unwatched:${userId}:all:fr`,
    `unwatched:${userId}:tv:en`,
    `unwatched:${userId}:tv:fr`,
    `unwatched:${userId}:movie:en`,
    `unwatched:${userId}:movie:fr`,
  ];
  await Promise.all(patterns.map((key) => deleteRedisKey(key)));
  await invalidateUpcomingCache(userId);
}

export async function getUnwatched(
  userId: string,
  type?: "tv" | "movie",
  language = "en",
): Promise<UnwatchedResult> {
  const cacheKey = `unwatched:${userId}:${type ?? "all"}:${language}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as UnwatchedResult;
    } catch {
      // Cache corrupt, continue to DB
    }
  }

  const filter: { userId: Types.ObjectId } = {
    userId: new Types.ObjectId(userId),
  };

  log("TrackingService", "getUnwatched filter", { userId, type, language, filter });

  const entries = await WatchEntry.find(filter)
    .populate("showId", "tmdbId title type posterPath status seasons translations genres firstAirDate networks")
    .lean();

  log("TrackingService", "getUnwatched entries", { count: entries.length, type });

  const now = new Date();

  if (type === "movie") {
    const movies = entries
      .filter((entry) => {
        const populatedShow = entry.showId as unknown as {
          type?: "tv" | "movie";
        };
        return populatedShow.type === "movie";
      })
      .map((entry) => {
        const populatedShow = entry.showId as unknown as {
          _id?: string;
          tmdbId?: number;
          title?: string;
          posterPath?: string | null;
          type?: "tv" | "movie";
          translations?: Map<string, ShowTranslation> | Record<string, ShowTranslation>;
          genres?: Array<{ id: number; name?: string }>;
          firstAirDate?: Date;
        };
        const translation = getTranslationValue(populatedShow.translations, language);
        const title = translation?.title ?? populatedShow.title ?? "Unknown";
        const localizedGenres = translation?.genres ?? populatedShow.genres;
        const year = populatedShow.firstAirDate ? new Date(populatedShow.firstAirDate).getFullYear() : undefined;
        return {
          showId: populatedShow._id?.toString() ?? entry.showId.toString(),
          tmdbId: populatedShow.tmdbId ?? 0,
          title,
          posterPath: populatedShow.posterPath ?? null,
          status: entry.status,
          type: "movie" as const,
          genres: localizedGenres,
          year,
        };
      });
    log("TrackingService", "getUnwatched movies", { count: movies.length });
    const result = { movies };
    await setRedisValue(cacheKey, JSON.stringify(result), 60);
    return result;
  }

  const shows: UnwatchedShow[] = [];

  for (const entry of entries) {
    const populatedShow = entry.showId as unknown as {
      _id?: string;
      tmdbId?: number;
      title?: string;
      posterPath?: string | null;
      type?: "tv" | "movie";
      status?: string;
      seasons?: Season[];
      translations?: Map<string, ShowTranslation> | Record<string, ShowTranslation>;
      networks?: Array<{ id: number; name?: string }>;
    };
    const translation = getTranslationValue(populatedShow.translations, language);
    const localizedTitle = translation?.title ?? populatedShow.title ?? "Unknown";
    const network = translation?.networks?.[0]?.name ?? populatedShow.networks?.[0]?.name;

    // Use translation seasons if they have episodes, otherwise fall back to show seasons
    const translationHasEpisodes = translation?.seasons?.some((s) => s.episodes && s.episodes.length > 0);
    const localizedSeasons = (translationHasEpisodes && translation?.seasons) ? translation.seasons : populatedShow.seasons;

    // Filter out seasons with no episodes (e.g., upcoming seasons not yet aired)
    const seasonsWithEpisodes = (localizedSeasons ?? []).filter(
      (season) => season.episodes && season.episodes.length > 0
    );

    const totalEpisodes = seasonsWithEpisodes.reduce(
      (sum, season) => sum + (season.episodes?.length ?? 0),
      0,
    );

    log("TrackingService", "getUnwatched entry", {
      showId: populatedShow._id,
      title: localizedTitle,
      type: populatedShow.type,
      status: entry.status,
      seasonsCount: localizedSeasons?.length ?? 0,
      seasonsWithEpisodesCount: seasonsWithEpisodes.length,
      totalEpisodes,
      watchedCount: entry.watchedEpisodes.length,
      hasTranslation: !!translation,
      translationHasSeasons: !!translation?.seasons,
      translationHasEpisodes,
      showHasSeasons: !!populatedShow.seasons,
      showSeasonsCount: populatedShow.seasons?.length ?? 0,
    });

    if (populatedShow.type !== "tv") {
      log("TrackingService", "getUnwatched skip: not tv", { title: localizedTitle });
      continue;
    }

    const watchedKeys = new Set(
      entry.watchedEpisodes.map((ep) => `${ep.season}-${ep.episode}`),
    );

    const unwatchedEpisodes: UnwatchedEpisode[] = [];
    let skippedNoAirDate = 0;
    let skippedFuture = 0;
    let skippedWatched = 0;

    for (const season of seasonsWithEpisodes) {
      for (const episode of season.episodes ?? []) {
        if (!episode.airDate) {
          skippedNoAirDate += 1;
          continue;
        }
        if (episode.airDate >= now) {
          skippedFuture += 1;
          log("TrackingService", "getUnwatched future episode", {
            title: localizedTitle,
            season: season.seasonNumber,
            episode: episode.episodeNumber,
            airDate: episode.airDate.toISOString(),
            now: now.toISOString(),
          });
          continue;
        }
        if (watchedKeys.has(`${season.seasonNumber}-${episode.episodeNumber}`)) {
          skippedWatched += 1;
          continue;
        }
        unwatchedEpisodes.push({
          season: season.seasonNumber,
          episode: episode.episodeNumber,
          name: episode.name,
          airDate: episode.airDate.toISOString(),
        });
      }
    }

    log("TrackingService", "getUnwatched result", {
      title: localizedTitle,
      unwatchedCount: unwatchedEpisodes.length,
      watchedKeys: Array.from(watchedKeys),
      totalEpisodes,
      skippedNoAirDate,
      skippedFuture,
      skippedWatched,
      latestUnwatched: unwatchedEpisodes[0] ?? null,
    });

    shows.push({
      showId: populatedShow._id?.toString() ?? entry.showId.toString(),
      tmdbId: populatedShow.tmdbId ?? 0,
      title: localizedTitle,
      posterPath: populatedShow.posterPath ?? null,
      type: "tv",
      status: entry.status,
      isEnded: isShowEnded(populatedShow.status),
      unwatchedEpisodes: unwatchedEpisodes.sort(
        (a, b) => new Date(b.airDate!).getTime() - new Date(a.airDate!).getTime(),
      ),
      watchedCount: getAiredWatchedCount(entry.watchedEpisodes, localizedSeasons ?? []),
      totalEpisodes: getAiredEpisodeCount(localizedSeasons ?? []),
      network,
    });
  }

  const withUnwatched = shows.filter((s) => s.unwatchedEpisodes.length > 0);
  const upToDate = shows.filter((s) => s.unwatchedEpisodes.length === 0);

  withUnwatched.sort((a, b) => {
    const aOldest = a.unwatchedEpisodes[a.unwatchedEpisodes.length - 1];
    const bOldest = b.unwatchedEpisodes[b.unwatchedEpisodes.length - 1];
    const aDate = aOldest ? new Date(aOldest.airDate!).getTime() : 0;
    const bDate = bOldest ? new Date(bOldest.airDate!).getTime() : 0;
    return aDate - bDate;
  });
  upToDate.sort((a, b) => a.title.localeCompare(b.title));

  shows.length = 0;
  shows.push(...withUnwatched, ...upToDate);

  log("TrackingService", "getUnwatched shows", { count: shows.length });
  const result = { shows };
  await setRedisValue(cacheKey, JSON.stringify(result), 60);
  return result;
}

export async function toggleDropped(userId: string, showId: string, dropped: boolean) {
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
      status: "plan_to_watch",
      watchedEpisodes: [],
    });
  }

  entry.status = dropped
    ? "dropped"
    : calculateWatchStatus(show, { watchedEpisodes: entry.watchedEpisodes });
  entry.updatedAt = new Date();
  await entry.save();
  await invalidateUnwatchedCache(userId);
  wsEvents.emit("tracking:updated", { userId, showId });
  return entry;
}
