import { Show, IShow, ShowTranslation } from "../models/show.model.js";
import { HydratedDocument } from "mongoose";
import {
  TmdbCast,
  TmdbCreatedBy,
  TmdbCrew,
  TmdbEpisode,
  TmdbGenre,
  TmdbNetwork,
  TmdbProductionCompany,
  TmdbSeason,
  TmdbShowDetails,
  tmdbService,
} from "./tmdb.service.js";
import { invalidateRedisPattern, setRedisValue, getRedisValue, deleteRedisKeyIfMatch } from "../lib/redis.js";
import { log, logError } from "../lib/logger.js";
import { wsEvents } from "../lib/wsEvents.js";

export type ShowDocument = HydratedDocument<IShow>;

const SHOW_METADATA_SYNC_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EPISODE_SYNC_TTL_MS = 6 * 60 * 60 * 1000;

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
    runtime: episode.runtime,
  };
}

export function mapTmdbSeasonToSeason(season: TmdbSeason) {
  return {
    seasonNumber: season.season_number,
    episodeCount: season.episode_count,
    episodes: season.episodes ? season.episodes.map(mapTmdbEpisodeToEpisode) : [],
  };
}

export function mapTmdbCastToCastMember(cast: TmdbCast) {
  return {
    id: cast.id,
    name: cast.name,
    character: cast.character,
    profilePath: cast.profile_path ?? undefined,
    order: cast.order,
  };
}

export function mapTmdbCrewToCrewMember(crew: TmdbCrew) {
  return {
    id: crew.id,
    name: crew.name,
    job: crew.job,
    department: crew.department,
    profilePath: crew.profile_path ?? undefined,
  };
}

export function mapTmdbGenreToGenre(genre: TmdbGenre) {
  return {
    id: genre.id,
    name: genre.name,
  };
}

export function mapTmdbNetworkToNetwork(network: TmdbNetwork) {
  return {
    id: network.id,
    name: network.name,
    logoPath: network.logo_path ?? undefined,
  };
}

export function mapTmdbProductionCompanyToProductionCompany(company: TmdbProductionCompany) {
  return {
    id: company.id,
    name: company.name,
    logoPath: company.logo_path ?? undefined,
  };
}

export function mapTmdbCreatedByToCrewMember(creator: TmdbCreatedBy) {
  return {
    id: creator.id,
    name: creator.name,
    job: "Creator",
    department: "Creator",
    profilePath: creator.profile_path ?? undefined,
  };
}

export function mapTmdbDetailsToTranslation(
  type: "tv" | "movie",
  tmdbDetails: TmdbShowDetails,
): ShowTranslation {
  const credits = tmdbDetails.credits;
  const createdByCrew = tmdbDetails.created_by?.map(mapTmdbCreatedByToCrewMember) ?? [];
  const crew = credits?.crew?.map(mapTmdbCrewToCrewMember) ?? [];
  const allCrew = [...createdByCrew, ...crew];
  const keyCrewJobs = new Set(["Creator", "Executive Producer", "Director"]);
  const keyCrew = allCrew.filter((member) => keyCrewJobs.has(member.job ?? ""));

  const seasons: Array<ReturnType<typeof mapTmdbSeasonToSeason>> = [];
  if (type === "tv" && tmdbDetails.seasons) {
    for (const season of tmdbDetails.seasons) {
      if (season.season_number === 0) continue;
      seasons.push(mapTmdbSeasonToSeason(season));
    }
  }

  return {
    title: normalizeTitle(tmdbDetails.name || tmdbDetails.title),
    overview: tmdbDetails.overview,
    status: tmdbDetails.status,
    genres: tmdbDetails.genres?.map(mapTmdbGenreToGenre),
    networks: tmdbDetails.networks?.map(mapTmdbNetworkToNetwork),
    productionCompanies: tmdbDetails.production_companies?.map(mapTmdbProductionCompanyToProductionCompany),
    cast: credits?.cast?.map(mapTmdbCastToCastMember),
    crew: keyCrew.length > 0 ? keyCrew : undefined,
    seasons: seasons.length > 0 ? seasons : undefined,
  };
}

export async function upsertShowFromTmdb(
  type: "tv" | "movie",
  tmdbDetails: TmdbShowDetails,
  language = "en",
): Promise<ShowDocument> {
  const normalizedLanguage = language.split("-")[0];
  const translation = mapTmdbDetailsToTranslation(type, tmdbDetails);
  const title = translation.title ?? "";
  const nextEpisode = tmdbDetails.next_episode_to_air;
  const nextEpisodeToAir: IShow["nextEpisodeToAir"] = nextEpisode
    ? (() => {
        const airDate = parseDate(nextEpisode.air_date);
        return airDate
          ? { season: nextEpisode.season_number, episode: nextEpisode.episode_number, airDate }
          : undefined;
      })()
    : undefined;

  const baseUpdate: Partial<IShow> = {
    type,
    posterPath: tmdbDetails.poster_path || undefined,
    firstAirDate: parseDate(tmdbDetails.first_air_date || tmdbDetails.release_date),
    nextEpisodeToAir,
    voteAverage: tmdbDetails.vote_average,
    voteCount: tmdbDetails.vote_count,
    runtime: type === "tv" ? tmdbDetails.episode_run_time?.[0] : tmdbDetails.runtime,
    numberOfSeasons: tmdbDetails.number_of_seasons,
    numberOfEpisodes: tmdbDetails.number_of_episodes,
    lastSyncedAt: new Date(),
  };

  const show = await Show.findOne({ tmdbId: tmdbDetails.id });

  if (show) {
    show.translations?.set(normalizedLanguage, translation);
    Object.assign(show, baseUpdate);
    if (show.title === title || !show.title) {
      show.title = title;
      show.overview = translation.overview;
      show.status = translation.status;
      show.genres = translation.genres;
      show.networks = translation.networks;
      show.productionCompanies = translation.productionCompanies;
      show.cast = translation.cast;
      show.crew = translation.crew;
      show.seasons = translation.seasons ?? show.seasons;
    }
    await show.save();
  } else {
    const newShow = new Show({
      tmdbId: tmdbDetails.id,
      ...baseUpdate,
      title,
      overview: translation.overview,
      status: translation.status,
      genres: translation.genres,
      networks: translation.networks,
      productionCompanies: translation.productionCompanies,
      cast: translation.cast,
      crew: translation.crew,
      seasons: translation.seasons ?? [],
      translations: { [normalizedLanguage]: translation },
    });
    await newShow.save();
  }

  const saved = await Show.findOne({ tmdbId: tmdbDetails.id });
  if (!saved) {
    throw new Error("Failed to upsert show");
  }

  await invalidateRedisPattern(`api:GET:/api/shows/${saved.tmdbId}*`);

  return saved;
}

export async function syncEpisodesForShow(show: ShowDocument, language = "en-US"): Promise<ShowDocument> {
  if (show.type !== "tv") return show;

  const normalizedLanguage = language.split("-")[0];
  const lockKey = `episode-sync-lock:${show.tmdbId}`;
  const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Try to acquire lock
  const existingLock = await getRedisValue(lockKey);
  if (existingLock) {
    log("CacheShowService", "syncEpisodes lock already held", { tmdbId: show.tmdbId, lockKey });
    // Wait for lock to be released (max 5s)
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const lockStillHeld = await getRedisValue(lockKey);
      if (!lockStillHeld) {
        // Lock released, reload show from DB
        const reloaded = await Show.findOne({ tmdbId: show.tmdbId });
        if (reloaded) {
          log("CacheShowService", "syncEpisodes lock released, reloaded", { tmdbId: show.tmdbId });
          return reloaded;
        }
      }
    }
    log("CacheShowService", "syncEpisodes lock timeout", { tmdbId: show.tmdbId });
    return show;
  }

  // Acquire lock with 30s TTL
  await setRedisValue(lockKey, lockValue, 30);

  try {
    // Reload show from DB to get latest version
    const freshShow = await Show.findById(show._id);
    if (!freshShow) {
      logError("CacheShowService", "syncEpisodes show not found", null, { tmdbId: show.tmdbId });
      return show;
    }

    const seasonNumbers = freshShow.seasons
      .filter((season) => season.seasonNumber > 0)
      .map((season) => season.seasonNumber);

    log("CacheShowService", "syncEpisodes start", { tmdbId: freshShow.tmdbId, seasonCount: seasonNumbers.length, language: normalizedLanguage });

    for (const seasonNumber of seasonNumbers) {
      try {
        const tmdbSeason = await tmdbService.getTvSeason(freshShow.tmdbId, seasonNumber, language);
        log("CacheShowService", "syncEpisodes tmdb season", {
          tmdbId: freshShow.tmdbId,
          seasonNumber,
          tmdbEpisodeCount: tmdbSeason.episodes?.length ?? 0,
        });
        const existingSeason = freshShow.seasons.find((s) => s.seasonNumber === seasonNumber);
        const mapped = mapTmdbSeasonToSeason(tmdbSeason);
        if (existingSeason) {
          existingSeason.episodes = mapped.episodes;
          existingSeason.episodeCount = mapped.episodeCount;
        } else {
          freshShow.seasons.push(mapped);
        }

        for (const [, translation] of freshShow.translations ?? []) {
          const trSeason = translation.seasons?.find((s) => s.seasonNumber === seasonNumber);
          if (trSeason) {
            trSeason.episodes = mapped.episodes;
            trSeason.episodeCount = mapped.episodeCount;
          }
        }
      } catch (err) {
        logError("CacheShowService", "syncEpisodes season failed", err, { tmdbId: freshShow.tmdbId, seasonNumber });
      }
    }

    log("CacheShowService", "syncEpisodes done", { tmdbId: freshShow.tmdbId, seasons: freshShow.seasons.map((s) => ({ seasonNumber: s.seasonNumber, episodeCount: s.episodes.length })) });

    try {
      const details = await tmdbService.getTvDetails(freshShow.tmdbId, language);
      const nextEpisode = details.next_episode_to_air;
      if (nextEpisode) {
        const airDate = parseDate(nextEpisode.air_date);
        if (airDate) {
          freshShow.nextEpisodeToAir = {
            season: nextEpisode.season_number,
            episode: nextEpisode.episode_number,
            airDate,
          };
        }
      }
    } catch {
      // Keep existing nextEpisodeToAir if the call fails.
    }

    freshShow.lastEpisodesSyncedAt = new Date();
    await freshShow.save();
  } finally {
    // Release lock only if we still own it
    await deleteRedisKeyIfMatch(lockKey, lockValue);
  }

  // Reload again to return latest version
  const finalShow = await Show.findById(show._id);
  return finalShow || show;
}

export async function refreshShowFromTmdb(tmdbId: number, language = "en-US"): Promise<ShowDocument | null> {
  let type: "tv" | "movie" | null = null;
  let details: TmdbShowDetails | null = null;

  try {
    details = await tmdbService.getTvDetails(tmdbId, language);
    type = "tv";
  } catch {
    try {
      details = await tmdbService.getMovieDetails(tmdbId, language);
      type = "movie";
    } catch {
      return null;
    }
  }

  const show = await upsertShowFromTmdb(type, details, language);

  if (show.type === "tv") {
    await syncEpisodesForShow(show, language);
  }

  wsEvents.emit("show:updated", {
    showId: show._id.toString(),
    updatedAt: new Date().toISOString(),
  });

  return show;
}
