import { Types } from "mongoose";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Rating } from "../models/rating.model.js";
import { Show } from "../models/show.model.js";
import { tmdbService, type TmdbEpisodeDetails } from "./tmdb.service.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { log } from "../lib/logger.js";

export interface EpisodeCommunityStats {
  watchedCount: number;
  ratingAverage: number | null;
  ratingCount: number;
}

export interface EpisodeTrivia {
  guestStars: Array<{
    id: number;
    name: string;
    character: string;
    profilePath: string | null;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profilePath: string | null;
  }>;
  runtime: number | null;
}

export interface EpisodeCommunityResult {
  stats: EpisodeCommunityStats;
  trivia: EpisodeTrivia | null;
}

export async function getEpisodeCommunity(
  showId: string,
  tmdbId: number,
  season: number,
  episode: number,
  locale: string,
): Promise<EpisodeCommunityResult> {
  const cacheKey = `episode-community:${showId}:${season}:${episode}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as EpisodeCommunityResult;
    } catch {
      // Cache corrupt, proceed to compute
    }
  }

  const [watchedCount, ratingAgg, trivia] = await Promise.all([
    WatchEntry.countDocuments({
      showId: new Types.ObjectId(showId),
      "watchedEpisodes.season": season,
      "watchedEpisodes.episode": episode,
    }),
    Rating.aggregate<{ _id: null; average: number; count: number }>([
      {
        $match: {
          showId: new Types.ObjectId(showId),
          "episodeRef.season": season,
          "episodeRef.episode": episode,
        },
      },
      { $group: { _id: null, average: { $avg: "$value" }, count: { $sum: 1 } } },
    ]),
    getEpisodeTrivia(tmdbId, season, episode, locale),
  ]);

  const stats: EpisodeCommunityStats = {
    watchedCount,
    ratingAverage: ratingAgg.length > 0 ? Math.round(ratingAgg[0].average * 10) / 10 : null,
    ratingCount: ratingAgg.length > 0 ? ratingAgg[0].count : 0,
  };

  const result: EpisodeCommunityResult = { stats, trivia };
  await setRedisValue(cacheKey, JSON.stringify(result), 300);
  return result;
}

async function getEpisodeTrivia(
  tmdbId: number,
  season: number,
  episode: number,
  locale: string,
): Promise<EpisodeTrivia | null> {
  try {
    const lang = locale.startsWith("en") ? "en-US" : locale;
    const details: TmdbEpisodeDetails = await tmdbService.getEpisodeDetails(tmdbId, season, episode, lang);

    return {
      guestStars: (details.guest_stars ?? []).slice(0, 10).map((gs) => ({
        id: gs.id,
        name: gs.name ?? "",
        character: gs.character ?? "",
        profilePath: gs.profile_path ?? null,
      })),
      crew: (details.crew ?? []).slice(0, 10).map((c) => ({
        id: c.id,
        name: c.name ?? "",
        job: c.job ?? "",
        department: c.department ?? "",
        profilePath: c.profile_path ?? null,
      })),
      runtime: details.runtime ?? null,
    };
  } catch (err) {
    log("EpisodeCommunity", "trivia fetch failed", err);
    return null;
  }
}
