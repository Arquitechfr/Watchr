import { Show, getLocalizedShow } from "../models/show.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { tmdbService, TmdbSearchResult } from "./tmdb.service.js";
import { normalizeLocale } from "../i18n/index.js";
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

export function toTmdbLanguage(locale: string): string {
  const base = normalizeLocale(locale);
  const region = base === "fr" ? "FR" : "US";
  return `${base}-${region}`;
}

export function toTvdbLanguage(locale: string): string {
  const base = normalizeLocale(locale);
  return base === "fr" ? "fra" : "eng";
}

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

export interface DiscoverSection {
  id: string;
  title: string;
  type: "tv" | "movie";
  items: SearchResultItem[];
}

export interface DiscoverResult {
  sections: DiscoverSection[];
}

export async function searchShows(query: string, locale = "en"): Promise<{ tmdb: SearchResultItem[]; tvdb: SearchResultItem[] }> {
  log("ShowService", "search start", { query, locale });
  const tmdbLanguage = toTmdbLanguage(locale);
  const tvdbLanguage = toTvdbLanguage(locale);

  let tmdbError: Error | null = null;
  const tmdbTvPromise = tmdbService.searchShows(query, tmdbLanguage).catch((err: Error) => {
    logError("ShowService", "tmdb tv search failed", err, { query });
    tmdbError = err;
    return [] as TmdbSearchResult[];
  });
  const tmdbMoviePromise = tmdbService.searchMovies(query, tmdbLanguage).catch((err: Error) => {
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
    log("ShowService", "search falling back to tvdb", { query, locale });
    let tvdbError: Error | null = null;
    try {
      const [tvdbTv, tvdbMovies] = await Promise.all([
        tvdbService.searchShows(query, tvdbLanguage).catch((err: Error) => {
          logError("ShowService", "tvdb tv search failed", err, { query });
          tvdbError = err;
          return [];
        }),
        tvdbService.searchMovies(query, tvdbLanguage).catch((err: Error) => {
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

export async function getDiscoverSections(locale = "en"): Promise<DiscoverResult> {
  log("ShowService", "discover start", { locale });
  const tmdbLanguage = toTmdbLanguage(locale);
  const isFr = normalizeLocale(locale) === "fr";

  const [trendingTv, trendingMovies, popularTv, popularMovies] = await Promise.all([
    tmdbService.getTrendingTv(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "trending tv failed", err);
      return [] as TmdbSearchResult[];
    }),
    tmdbService.getTrendingMovies(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "trending movies failed", err);
      return [] as TmdbSearchResult[];
    }),
    tmdbService.getPopularTv(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "popular tv failed", err);
      return [] as TmdbSearchResult[];
    }),
    tmdbService.getPopularMovies(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "popular movies failed", err);
      return [] as TmdbSearchResult[];
    }),
  ]);

  const sections: DiscoverSection[] = [
    {
      id: "trending-tv",
      title: isFr ? "Séries tendances" : "Trending TV Shows",
      type: "tv",
      items: trendingTv.map((item) => mapTmdbResult(item, "tv")),
    },
    {
      id: "trending-movie",
      title: isFr ? "Films tendances" : "Trending Movies",
      type: "movie",
      items: trendingMovies.map((item) => mapTmdbResult(item, "movie")),
    },
    {
      id: "popular-tv",
      title: isFr ? "Séries populaires" : "Popular TV Shows",
      type: "tv",
      items: popularTv.map((item) => mapTmdbResult(item, "tv")),
    },
    {
      id: "popular-movie",
      title: isFr ? "Films populaires" : "Popular Movies",
      type: "movie",
      items: popularMovies.map((item) => mapTmdbResult(item, "movie")),
    },
  ];

  log("ShowService", "discover result", {
    trendingTv: trendingTv.length,
    trendingMovies: trendingMovies.length,
    popularTv: popularTv.length,
    popularMovies: popularMovies.length,
  });

  return { sections };
}

export async function getShowDetails(tmdbId: number, locale = "en"): Promise<ReturnType<typeof showToResponse>> {
  log("ShowService", "details start", { tmdbId, locale });
  const normalizedLocale = normalizeLocale(locale);
  const tmdbLanguage = toTmdbLanguage(locale);
  let show = await Show.findOne({ tmdbId });
  log("ShowService", "details cache", { tmdbId, cached: Boolean(show), stale: isShowCacheStale(show) });

  const hasTranslation = Boolean(show?.translations?.has(normalizedLocale));
  const isMissingEnriched = !show || show.cast === undefined;
  const needsRefresh = !show || isShowCacheStale(show) || isMissingEnriched || !hasTranslation;
  log("ShowService", "details enriched check", { tmdbId, hasCast: Boolean(show?.cast?.length), isMissingEnriched, hasTranslation });

  let metadataRefreshed = false;
  if (needsRefresh) {
    try {
      const tmdbDetails = await tmdbService.getTvDetails(tmdbId, tmdbLanguage);
      log("ShowService", "details tmdb credits", {
        tmdbId,
        castCount: tmdbDetails.credits?.cast?.length ?? 0,
        crewCount: tmdbDetails.credits?.crew?.length ?? 0,
        createdByCount: tmdbDetails.created_by?.length ?? 0,
      });
      show = await upsertShowFromTmdb("tv", tmdbDetails, undefined, normalizedLocale);
      metadataRefreshed = true;
      log("ShowService", "details upserted tv", { tmdbId, title: show.title, castCount: show.cast?.length, crewCount: show.crew?.length });
    } catch (tvErr) {
      logError("ShowService", "details tv fetch failed", tvErr, { tmdbId });
      if (!show) {
        try {
          const movieDetails = await tmdbService.getMovieDetails(tmdbId, tmdbLanguage);
          show = await upsertShowFromTmdb("movie", movieDetails, undefined, normalizedLocale);
          metadataRefreshed = true;
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

  const isMissingEpisodes = show.type === "tv" && show.seasons.some((s) => s.episodes.length === 0);
  const translationNeedsEpisodes = !show.translations?.has(normalizedLocale) ||
    show.translations?.get(normalizedLocale)?.seasons?.some((s) => s.episodes.length === 0);
  if (show.type === "tv" && show.seasons.length > 0 && (isEpisodesCacheStale(show) || metadataRefreshed || isMissingEpisodes || translationNeedsEpisodes)) {
    try {
      show = await syncEpisodesForShow(show, tmdbLanguage);
      log("ShowService", "details episodes synced", { tmdbId, title: show.title });
      await invalidateRedisPattern(`api:GET:/api/shows/${tmdbId}*`);
    } catch (syncErr) {
      logError("ShowService", "details episode sync failed", syncErr, { tmdbId });
    }
  }

  return showToResponse(show, normalizedLocale);
}

export function showToResponse(show: ShowDocument, locale = "en") {
  const localized = getLocalizedShow(show, locale);
  const response = {
    id: show._id.toString(),
    tmdbId: show.tmdbId,
    tvdbId: show.tvdbId,
    type: show.type,
    title: localized.title,
    posterPath: show.posterPath,
    overview: localized.overview,
    firstAirDate: show.firstAirDate?.toISOString(),
    seasons: localized.seasons?.map((season) => ({
      seasonNumber: season.seasonNumber,
      episodeCount: season.episodeCount ?? season.episodes.length,
    })) ?? show.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      episodeCount: season.episodeCount ?? season.episodes.length,
    })),
    nextEpisodeToAir: show.nextEpisodeToAir,
    cast: localized.cast,
    crew: localized.crew,
    genres: localized.genres,
    status: localized.status,
    voteAverage: show.voteAverage,
    voteCount: show.voteCount,
    runtime: show.runtime,
    networks: localized.networks,
    productionCompanies: localized.productionCompanies,
    numberOfSeasons: show.numberOfSeasons,
    numberOfEpisodes: show.numberOfEpisodes,
    lastSyncedAt: show.lastSyncedAt?.toISOString(),
    lastEpisodesSyncedAt: show.lastEpisodesSyncedAt?.toISOString(),
  };

  log("ShowService", "showToResponse enriched", {
    tmdbId: response.tmdbId,
    castCount: response.cast?.length ?? 0,
    crewCount: response.crew?.length ?? 0,
    genresCount: response.genres?.length ?? 0,
    networksCount: response.networks?.length ?? 0,
  });

  return response;
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
    runtime?: number;
  }>;
}

export async function getSeasonDetails(tmdbId: number, seasonNumber: number, locale = "en"): Promise<SeasonDetails> {
  log("ShowService", "season details start", { tmdbId, seasonNumber, locale });
  const normalizedLocale = normalizeLocale(locale);
  const tmdbLanguage = toTmdbLanguage(locale);

  let show = await Show.findOne({ tmdbId });

  if (!show) {
    try {
      const tmdbDetails = await tmdbService.getTvDetails(tmdbId, tmdbLanguage);
      show = await upsertShowFromTmdb("tv", tmdbDetails, undefined, normalizedLocale);
    } catch {
      try {
        const movieDetails = await tmdbService.getMovieDetails(tmdbId, tmdbLanguage);
        show = await upsertShowFromTmdb("movie", movieDetails, undefined, normalizedLocale);
      } catch {
        throw new ApiError(502, "EXTERNAL_SERVICES_DOWN", "TMDB is unavailable and this show is not cached");
      }
    }
  }

  if (!show || show.type !== "tv") {
    throw new ApiError(404, "SEASON_NOT_FOUND", "Season not found");
  }

  let season = show.seasons.find((s) => s.seasonNumber === seasonNumber);
  const isMissingEpisodes = !season || season.episodes.length === 0;

  if (isMissingEpisodes || isEpisodesCacheStale(show)) {
    try {
      show = await syncEpisodesForShow(show, tmdbLanguage);
      season = show.seasons.find((s) => s.seasonNumber === seasonNumber);
      await invalidateRedisPattern(`api:GET:/api/shows/${tmdbId}*`);
    } catch (syncErr) {
      logError("ShowService", "season episode sync failed", syncErr, { tmdbId, seasonNumber });
      // Retry once on version conflict
      show = await Show.findOne({ tmdbId });
      if (show) {
        try {
          show = await syncEpisodesForShow(show, tmdbLanguage);
          season = show.seasons.find((s) => s.seasonNumber === seasonNumber);
          await invalidateRedisPattern(`api:GET:/api/shows/${tmdbId}*`);
        } catch (retryErr) {
          logError("ShowService", "season episode sync retry failed", retryErr, { tmdbId, seasonNumber });
        }
      }
    }
  }

  if (!season) {
    throw new ApiError(404, "SEASON_NOT_FOUND", "Season not found");
  }

  log("ShowService", "season details response", {
    tmdbId,
    seasonNumber,
    episodeCount: season.episodes.length,
    firstEpisodeName: season.episodes[0]?.name,
  });

  return {
    tmdbId,
    seasonNumber,
    episodes: season.episodes.map((episode) => ({
      episodeNumber: episode.episodeNumber,
      name: episode.name,
      overview: episode.overview,
      stillPath: episode.stillPath,
      airDate: episode.airDate?.toISOString(),
      runtime: episode.runtime,
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
