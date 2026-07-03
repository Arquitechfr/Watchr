import { Show, IShow } from "../models/show.model.js";
import { HydratedDocument } from "mongoose";
import {
  TmdbEpisode,
  TmdbSeason,
  TmdbShowDetails,
  tmdbService,
} from "./tmdb.service.js";

export type ShowDocument = HydratedDocument<IShow>;

const SHOW_METADATA_SYNC_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EPISODE_SYNC_TTL_MS = 24 * 60 * 60 * 1000;

export function isShowCacheStale(show?: IShow | null): boolean {
  if (!show || !show.lastSyncedAt) return true;
  return Date.now() - show.lastSyncedAt.getTime() > SHOW_METADATA_SYNC_TTL_MS;
}

export function isEpisodesCacheStale(show?: IShow | null): boolean {
  if (!show || show.type !== "tv" || !show.lastEpisodesSyncedAt) return true;
  return Date.now() - show.lastEpisodesSyncedAt.getTime() > EPISODE_SYNC_TTL_MS;
}

export function normalizeTitle(title?: string): string {
  return (title || "").trim();
}

export function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export function mapTmdbEpisodeToEpisode(episode: TmdbEpisode) {
  return {
    episodeNumber: episode.episode_number,
    name: episode.name,
    overview: episode.overview,
    stillPath: episode.still_path ?? undefined,
    airDate: parseDate(episode.air_date),
  };
}

export function mapTmdbSeasonToSeason(season: TmdbSeason) {
  return {
    seasonNumber: season.season_number,
    episodeCount: season.episode_count,
    episodes: season.episodes ? season.episodes.map(mapTmdbEpisodeToEpisode) : [],
  };
}

export async function upsertShowFromTmdb(
  type: "tv" | "movie",
  tmdbDetails: TmdbShowDetails,
  tvdbId?: number,
): Promise<ShowDocument> {
  const title = normalizeTitle(tmdbDetails.name || tmdbDetails.title);
  const nextEpisode = tmdbDetails.next_episode_to_air;
  const nextEpisodeToAir: IShow["nextEpisodeToAir"] = nextEpisode
    ? (() => {
        const airDate = parseDate(nextEpisode.air_date);
        return airDate
          ? { season: nextEpisode.season_number, episode: nextEpisode.episode_number, airDate }
          : undefined;
      })()
    : undefined;

  const seasons: Array<ReturnType<typeof mapTmdbSeasonToSeason>> = [];
  if (type === "tv" && tmdbDetails.seasons) {
    for (const season of tmdbDetails.seasons) {
      if (season.season_number === 0) continue;
      seasons.push(mapTmdbSeasonToSeason(season));
    }
  }

  const update: Partial<IShow> = {
    type,
    title,
    posterPath: tmdbDetails.poster_path || undefined,
    overview: tmdbDetails.overview,
    firstAirDate: parseDate(tmdbDetails.first_air_date || tmdbDetails.release_date),
    seasons,
    nextEpisodeToAir,
    lastSyncedAt: new Date(),
    lastEpisodesSyncedAt: new Date(),
  };

  const show = await Show.findOneAndUpdate({ tmdbId: tmdbDetails.id }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  if (!show) {
    throw new Error("Failed to upsert show");
  }

  if (tvdbId && !show.tvdbId) {
    show.tvdbId = tvdbId;
    await show.save();
  }

  return show;
}

export async function syncEpisodesForShow(show: ShowDocument): Promise<ShowDocument> {
  if (show.type !== "tv") return show;

  const seasonNumbers = show.seasons
    .filter((season) => season.seasonNumber > 0)
    .map((season) => season.seasonNumber);

  for (const seasonNumber of seasonNumbers) {
    try {
      const tmdbSeason = await tmdbService.getTvSeason(show.tmdbId, seasonNumber);
      const existingSeason = show.seasons.find((s) => s.seasonNumber === seasonNumber);
      const mapped = mapTmdbSeasonToSeason(tmdbSeason);
      if (existingSeason) {
        existingSeason.episodes = mapped.episodes;
        existingSeason.episodeCount = mapped.episodeCount;
      } else {
        show.seasons.push(mapped);
      }
    } catch {
      // Continue if a season detail call fails.
    }
  }

  try {
    const details = await tmdbService.getTvDetails(show.tmdbId);
    const nextEpisode = details.next_episode_to_air;
    if (nextEpisode) {
      const airDate = parseDate(nextEpisode.air_date);
      if (airDate) {
        show.nextEpisodeToAir = {
          season: nextEpisode.season_number,
          episode: nextEpisode.episode_number,
          airDate,
        };
      }
    }
  } catch {
    // Keep existing nextEpisodeToAir if the call fails.
  }

  show.lastEpisodesSyncedAt = new Date();
  await show.save();
  return show;
}

export async function refreshShowFromTmdb(tmdbId: number): Promise<ShowDocument | null> {
  let type: "tv" | "movie" | null = null;
  let details: TmdbShowDetails | null = null;

  try {
    details = await tmdbService.getTvDetails(tmdbId);
    type = "tv";
  } catch {
    try {
      details = await tmdbService.getMovieDetails(tmdbId);
      type = "movie";
    } catch {
      return null;
    }
  }

  const show = await upsertShowFromTmdb(type, details);

  if (show.type === "tv") {
    await syncEpisodesForShow(show);
  }

  return show;
}
