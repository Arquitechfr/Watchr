import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isSameDay,
  addWeeks,
  isAfter,
} from "date-fns";
import { Types } from "mongoose";
import { WatchEntry } from "../models/watchEntry.model.js";
import { IShow, getShowTitle, getTranslationValue } from "../models/show.model.js";
import { getRedisValue, setRedisValue, deleteRedisKey } from "../lib/redis.js";

export async function invalidateUpcomingCache(userId: string): Promise<void> {
  await Promise.all([
    deleteRedisKey(`upcoming:${userId}:en`),
    deleteRedisKey(`upcoming:${userId}:fr`),
  ]);
}

export interface UpcomingEpisode {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  season: number;
  episode: number;
  name?: string;
  airDate: string;
  isSeriesPremiere: boolean;
  isSeasonPremiere: boolean;
  isFinale: boolean;
  network?: string;
}

export interface UpcomingCalendar {
  today: UpcomingEpisode[];
  thisWeek: UpcomingEpisode[];
  nextWeek: UpcomingEpisode[];
  later: UpcomingEpisode[];
}

export async function getUpcomingEpisodes(userId: string, language = "en"): Promise<UpcomingCalendar> {
  const cacheKey = `upcoming:${userId}:${language}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as UpcomingCalendar;
    } catch {
      // Cache corrupt, continue to DB
    }
  }

  const entries = await WatchEntry.find({
    userId: new Types.ObjectId(userId),
    status: { $in: ["watching", "plan_to_watch"] },
  })
    .populate("showId", "tmdbId title type posterPath status seasons nextEpisodeToAir translations networks")
    .lean();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const allEpisodes: UpcomingEpisode[] = [];

  for (const entry of entries) {
    const show = entry.showId as unknown as IShow | null;

    if (!show || !show.seasons) continue;
    if (show.type !== "tv") continue;

    const title = getShowTitle(show, language);
    const translation = getTranslationValue(show.translations, language);
    const translationHasEpisodes = translation?.seasons?.some((s) => s.episodes && s.episodes.length > 0);
    const seasons = (translationHasEpisodes && translation?.seasons) ? translation.seasons : show.seasons;
    const network = translation?.networks?.[0]?.name ?? show.networks?.[0]?.name;
    const showId = show._id?.toString() ?? entry.showId.toString();
    const tmdbId = show.tmdbId ?? 0;
    const posterPath = show.posterPath ?? undefined;

    const watchedKeys = new Set(
      entry.watchedEpisodes.map((ep) => `${ep.season}-${ep.episode}`),
    );

    const seasonsWithEpisodes = (seasons ?? []).filter(
      (season) => season.episodes && season.episodes.length > 0,
    );

    for (const season of seasonsWithEpisodes) {
      const seasonEpisodeCount = season.episodes?.length ?? season.episodeCount ?? 0;
      for (const episode of season.episodes || []) {
        if (!episode.airDate || episode.airDate < now) continue;
        if (watchedKeys.has(`${season.seasonNumber}-${episode.episodeNumber}`)) continue;

        allEpisodes.push({
          showId,
          tmdbId,
          title,
          posterPath,
          season: season.seasonNumber,
          episode: episode.episodeNumber,
          name: episode.name,
          airDate: episode.airDate.toISOString(),
          isSeriesPremiere: season.seasonNumber === 1 && episode.episodeNumber === 1,
          isSeasonPremiere: season.seasonNumber > 1 && episode.episodeNumber === 1,
          isFinale: seasonEpisodeCount > 0 && episode.episodeNumber === seasonEpisodeCount,
          network,
        });
      }
    }

    if (show.nextEpisodeToAir && show.nextEpisodeToAir.airDate && show.nextEpisodeToAir.airDate >= now) {
      const key = `${show.nextEpisodeToAir.season}-${show.nextEpisodeToAir.episode}`;
      if (!watchedKeys.has(key)) {
        const nextSeason = seasons.find((s) => s.seasonNumber === show.nextEpisodeToAir!.season);
        const nextSeasonEpisodeCount = nextSeason?.episodes?.length ?? nextSeason?.episodeCount ?? 0;
        allEpisodes.push({
          showId,
          tmdbId,
          title,
          posterPath,
          season: show.nextEpisodeToAir.season,
          episode: show.nextEpisodeToAir.episode,
          airDate: show.nextEpisodeToAir.airDate.toISOString(),
          isSeriesPremiere: show.nextEpisodeToAir.season === 1 && show.nextEpisodeToAir.episode === 1,
          isSeasonPremiere: show.nextEpisodeToAir.season > 1 && show.nextEpisodeToAir.episode === 1,
          isFinale: nextSeasonEpisodeCount > 0 && show.nextEpisodeToAir.episode === nextSeasonEpisodeCount,
          network,
        });
      }
    }
  }

  const uniqueEpisodes = new Map<string, UpcomingEpisode>();
  for (const ep of allEpisodes) {
    const key = `${ep.showId}-${ep.season}-${ep.episode}`;
    if (!uniqueEpisodes.has(key)) {
      uniqueEpisodes.set(key, ep);
    }
  }

  const episodes = Array.from(uniqueEpisodes.values()).sort(
    (a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime(),
  );

  const today: UpcomingEpisode[] = [];
  const thisWeek: UpcomingEpisode[] = [];
  const nextWeek: UpcomingEpisode[] = [];
  const later: UpcomingEpisode[] = [];

  const nextWeekStart = addWeeks(weekStart, 1);
  const nextWeekEnd = addWeeks(weekEnd, 1);

  for (const ep of episodes) {
    const airDate = new Date(ep.airDate);
    if (isSameDay(airDate, now)) {
      today.push(ep);
    } else if (isWithinInterval(airDate, { start: weekStart, end: weekEnd })) {
      thisWeek.push(ep);
    } else if (isWithinInterval(airDate, { start: nextWeekStart, end: nextWeekEnd })) {
      nextWeek.push(ep);
    } else if (isAfter(airDate, nextWeekEnd)) {
      later.push(ep);
    }
  }

  const result = { today, thisWeek, nextWeek, later };
  await setRedisValue(cacheKey, JSON.stringify(result), 60);
  return result;
}
