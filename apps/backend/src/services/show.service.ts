import { Show } from "../models/show.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { tmdbService, TmdbSearchResult } from "./tmdb.service.js";
import { tvdbService } from "./tvdb.service.js";
import {
  isShowCacheStale,
  isEpisodesCacheStale,
  upsertShowFromTmdb,
  syncEpisodesForShow,
  ShowDocument,
} from "./cacheShow.service.js";
import { scheduleShowRefresh } from "../workers/episodeSync.worker.js";
import { invalidateRedisPattern } from "../lib/redis.js";
import { log, logError } from "../lib/logger.js";

export interface SearchResultItem {
  tmdbId?: number;
  tvdbId?: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  firstAirDate?: string;
  source: "tmdb" | "tvdb";
}

export async function searchShows(query: string): Promise<{ tmdb: SearchResultItem[]; tvdb: SearchResultItem[] }> {
  log("ShowService", "search start", { query });

  let tmdbError: Error | null = null;
  const tmdbTvPromise = tmdbService.searchShows(query).catch((err: Error) => {
    logError("ShowService", "tmdb tv search failed", err, { query });
    tmdbError = err;
    return [] as TmdbSearchResult[];
  });
  const tmdbMoviePromise = tmdbService.searchMovies(query).catch((err: Error) => {
    logError("ShowService", "tmdb movie search failed", err, { query });
    tmdbError = err;
    return [] as TmdbSearchResult[];
  });

  const [tmdbTv, tmdbMovies] = await Promise.all([tmdbTvPromise, tmdbMoviePromise]);

  const tmdbResults: SearchResultItem[] = [
    ...tmdbTv.map((item) => mapTmdbResult(item, "tv")),
    ...tmdbMovies.map((item) => mapTmdbResult(item, "movie")),
  ];

  log("ShowService", "search tmdb results", { query, count: tmdbResults.length, tmdbError: Boolean(tmdbError) });

  let tvdbResults: SearchResultItem[] = [];
  if (tmdbResults.length === 0) {
    log("ShowService", "search falling back to tvdb", { query });
    let tvdbError: Error | null = null;
    try {
      const [tvdbTv, tvdbMovies] = await Promise.all([
        tvdbService.searchShows(query).catch((err: Error) => {
          logError("ShowService", "tvdb tv search failed", err, { query });
          tvdbError = err;
          return [];
        }),
        tvdbService.searchMovies(query).catch((err: Error) => {
          logError("ShowService", "tvdb movie search failed", err, { query });
          tvdbError = err;
          return [];
        }),
      ]);
      tvdbResults = [
        ...tvdbTv.map((item) => mapTvdbResult(item, "tv")),
        ...tvdbMovies.map((item) => mapTvdbResult(item, "movie")),
      ];
      log("ShowService", "search tvdb results", { query, count: tvdbResults.length, tvdbError: Boolean(tvdbError) });
    } catch (err) {
      logError("ShowService", "tvdb fallback failed", err, { query });
      tvdbError = err instanceof Error ? err : new Error(String(err));
    }

    if (tmdbError && tvdbError) {
      throw new ApiError(502, "EXTERNAL_SERVICES_DOWN", "TMDB and TVDB are unavailable");
    }
  }

  return { tmdb: tmdbResults, tvdb: tvdbResults };
}

export async function getShowDetails(tmdbId: number): Promise<ReturnType<typeof showToResponse>> {
  log("ShowService", "details start", { tmdbId });
  let show = await Show.findOne({ tmdbId });
  log("ShowService", "details cache", { tmdbId, cached: Boolean(show), stale: isShowCacheStale(show) });

  if (!show) {
    try {
      const tmdbDetails = await tmdbService.getTvDetails(tmdbId);
      show = await upsertShowFromTmdb("tv", tmdbDetails);
      log("ShowService", "details upserted tv", { tmdbId, title: show.title });
    } catch (tvErr) {
      logError("ShowService", "details tv fetch failed", tvErr, { tmdbId });
      try {
        const movieDetails = await tmdbService.getMovieDetails(tmdbId);
        show = await upsertShowFromTmdb("movie", movieDetails);
        log("ShowService", "details upserted movie", { tmdbId, title: show.title });
      } catch (movieErr) {
        logError("ShowService", "details movie fetch failed", movieErr, { tmdbId });
        throw new ApiError(
          502,
          "EXTERNAL_SERVICES_DOWN",
          "TMDB is unavailable and this show is not cached",
        );
      }
    }
  }

  if (!show) {
    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  }

  if (isShowCacheStale(show)) {
    log("ShowService", "details stale scheduling refresh", { tmdbId });
    try {
      await scheduleShowRefresh(tmdbId);
    } catch (err) {
      logError("ShowService", "details refresh scheduling failed", err, { tmdbId });
    }
  }

  if (show.type === "tv" && show.seasons.length > 0 && isEpisodesCacheStale(show)) {
    try {
      show = await syncEpisodesForShow(show);
      log("ShowService", "details episodes synced", { tmdbId, title: show.title });
      await invalidateRedisPattern(`api:GET:/api/shows/${tmdbId}*`);
    } catch (syncErr) {
      logError("ShowService", "details episode sync failed", syncErr, { tmdbId });
    }
  }

  return showToResponse(show);
}

export function showToResponse(show: ShowDocument) {
  return {
    id: show._id.toString(),
    tmdbId: show.tmdbId,
    tvdbId: show.tvdbId,
    type: show.type,
    title: show.title,
    posterPath: show.posterPath,
    overview: show.overview,
    firstAirDate: show.firstAirDate?.toISOString(),
    seasons: show.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      episodeCount: season.episodeCount ?? season.episodes.length,
    })),
    nextEpisodeToAir: show.nextEpisodeToAir,
    lastSyncedAt: show.lastSyncedAt?.toISOString(),
    lastEpisodesSyncedAt: show.lastEpisodesSyncedAt?.toISOString(),
  };
}

export interface SeasonDetails {
  tmdbId: number;
  seasonNumber: number;
  episodes: Array<{
    episodeNumber: number;
    name?: string;
    overview?: string;
    stillPath?: string;
    airDate?: string;
  }>;
}

export async function getSeasonDetails(tmdbId: number, seasonNumber: number): Promise<SeasonDetails> {
  log("ShowService", "season details start", { tmdbId, seasonNumber });

  let show = await Show.findOne({ tmdbId });

  if (!show) {
    try {
      const tmdbDetails = await tmdbService.getTvDetails(tmdbId);
      show = await upsertShowFromTmdb("tv", tmdbDetails);
    } catch {
      try {
        const movieDetails = await tmdbService.getMovieDetails(tmdbId);
        show = await upsertShowFromTmdb("movie", movieDetails);
      } catch {
        throw new ApiError(502, "EXTERNAL_SERVICES_DOWN", "TMDB is unavailable and this show is not cached");
      }
    }
  }

  if (!show || show.type !== "tv") {
    throw new ApiError(404, "SEASON_NOT_FOUND", "Season not found");
  }

  let season = show.seasons.find((s) => s.seasonNumber === seasonNumber);

  if (!season || isEpisodesCacheStale(show)) {
    try {
      show = await syncEpisodesForShow(show);
      season = show.seasons.find((s) => s.seasonNumber === seasonNumber);
      await invalidateRedisPattern(`api:GET:/api/shows/${tmdbId}*`);
    } catch (syncErr) {
      logError("ShowService", "season episode sync failed", syncErr, { tmdbId, seasonNumber });
    }
  }

  if (!season) {
    throw new ApiError(404, "SEASON_NOT_FOUND", "Season not found");
  }

  return {
    tmdbId,
    seasonNumber,
    episodes: season.episodes.map((episode) => ({
      episodeNumber: episode.episodeNumber,
      name: episode.name,
      overview: episode.overview,
      stillPath: episode.stillPath,
      airDate: episode.airDate?.toISOString(),
    })),
  };
}

function mapTmdbResult(item: TmdbSearchResult, type: "tv" | "movie"): SearchResultItem {
  return {
    tmdbId: item.id,
    type,
    title: (item.name || item.title || "Unknown").trim(),
    posterPath: item.poster_path || undefined,
    overview: item.overview,
    firstAirDate: item.first_air_date || item.release_date,
    source: "tmdb",
  };
}

function mapTvdbResult(item: { id: number; name?: string; image?: string | null; overview?: string; firstAired?: string }, type: "tv" | "movie"): SearchResultItem {
  return {
    tvdbId: item.id,
    type,
    title: (item.name || "Unknown").trim(),
    posterPath: item.image || undefined,
    overview: item.overview,
    firstAirDate: item.firstAired,
    source: "tvdb",
  };
}

export { syncEpisodesForShow };
