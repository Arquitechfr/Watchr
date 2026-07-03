import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Types } from "mongoose";
import { WatchEntry } from "../models/watchEntry.model.js";
import { IShow } from "../models/show.model.js";

export interface UpcomingEpisode {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  season: number;
  episode: number;
  name?: string;
  airDate: string;
}

export async function getUpcomingEpisodes(userId: string): Promise<{
  thisWeek: UpcomingEpisode[];
  upcoming: UpcomingEpisode[];
}> {
  const entries = await WatchEntry.find({
    userId: new Types.ObjectId(userId),
    status: { $in: ["watching", "plan_to_watch"] },
  }).populate("showId");

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const allEpisodes: UpcomingEpisode[] = [];

  for (const entry of entries) {
    const show = entry.showId as unknown as IShow;
    if (!show || !show.seasons) continue;

    const watchedKeys = new Set(
      entry.watchedEpisodes.map((ep) => `${ep.season}-${ep.episode}`),
    );

    for (const season of show.seasons) {
      for (const episode of season.episodes || []) {
        if (!episode.airDate || episode.airDate < now) continue;
        if (watchedKeys.has(`${season.seasonNumber}-${episode.episodeNumber}`)) continue;

        allEpisodes.push({
          showId: show._id.toString(),
          tmdbId: show.tmdbId,
          title: show.title,
          posterPath: show.posterPath,
          season: season.seasonNumber,
          episode: episode.episodeNumber,
          name: episode.name,
          airDate: episode.airDate.toISOString(),
        });
      }
    }

    if (show.nextEpisodeToAir && show.nextEpisodeToAir.airDate >= now) {
      const key = `${show.nextEpisodeToAir.season}-${show.nextEpisodeToAir.episode}`;
      if (!watchedKeys.has(key)) {
        allEpisodes.push({
          showId: show._id.toString(),
          tmdbId: show.tmdbId,
          title: show.title,
          posterPath: show.posterPath,
          season: show.nextEpisodeToAir.season,
          episode: show.nextEpisodeToAir.episode,
          airDate: show.nextEpisodeToAir.airDate.toISOString(),
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

  const thisWeek: UpcomingEpisode[] = [];
  const upcoming: UpcomingEpisode[] = [];

  for (const ep of episodes) {
    const airDate = new Date(ep.airDate);
    if (isWithinInterval(airDate, { start: weekStart, end: weekEnd })) {
      thisWeek.push(ep);
    } else {
      upcoming.push(ep);
    }
  }

  return { thisWeek, upcoming };
}
