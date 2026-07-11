import { Show, getLocalizedShow } from "../models/show.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { tmdbService, TmdbSearchResult, TmdbPaginatedResult } from "./tmdb.service.js";
import { normalizeLocale } from "../i18n/index.js";
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

export interface SearchResultItem {
  tmdbId?: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  firstAirDate?: string;
  source: "tmdb";
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

export interface DiscoverSectionItemsResult {
  items: SearchResultItem[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

const DISCOVER_SECTION_IDS = ["trending-tv", "trending-movie", "popular-tv", "popular-movie"] as const;
export type DiscoverSectionId = (typeof DISCOVER_SECTION_IDS)[number];

export async function searchShows(query: string, locale = "en"): Promise<SearchResultItem[]> {
  log("ShowService", "search start", { query, locale });
  const tmdbLanguage = toTmdbLanguage(locale);

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

  const results: SearchResultItem[] = [
    ...tmdbTv.map((item) => mapTmdbResult(item, "tv")),
    ...tmdbMovies.map((item) => mapTmdbResult(item, "movie")),
  ];

  log("ShowService", "search results", { query, count: results.length, tmdbError: Boolean(tmdbError) });

  if (tmdbError) {
    throw new ApiError(502, "EXTERNAL_SERVICES_DOWN", "TMDB is unavailable");
  }

  return results;
}

export async function getDiscoverSections(locale = "en"): Promise<DiscoverResult> {
  log("ShowService", "discover start", { locale });
  const tmdbLanguage = toTmdbLanguage(locale);
  const isFr = normalizeLocale(locale) === "fr";

  const [trendingTv, trendingMovies, popularTv, popularMovies] = await Promise.all([
    tmdbService.getTrendingTv(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "trending tv failed", err);
      return { results: [] as TmdbSearchResult[], page: 1, totalPages: 0 } as TmdbPaginatedResult;
    }),
    tmdbService.getTrendingMovies(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "trending movies failed", err);
      return { results: [] as TmdbSearchResult[], page: 1, totalPages: 0 } as TmdbPaginatedResult;
    }),
    tmdbService.getPopularTv(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "popular tv failed", err);
      return { results: [] as TmdbSearchResult[], page: 1, totalPages: 0 } as TmdbPaginatedResult;
    }),
    tmdbService.getPopularMovies(10, tmdbLanguage).catch((err: Error) => {
      logError("ShowService", "popular movies failed", err);
      return { results: [] as TmdbSearchResult[], page: 1, totalPages: 0 } as TmdbPaginatedResult;
    }),
  ]);

  const sections: DiscoverSection[] = [
    {
      id: "trending-tv",
      title: isFr ? "Séries tendances" : "Trending TV Shows",
      type: "tv",
      items: trendingTv.results.map((item) => mapTmdbResult(item, "tv")),
    },
    {
      id: "trending-movie",
      title: isFr ? "Films tendances" : "Trending Movies",
      type: "movie",
      items: trendingMovies.results.map((item) => mapTmdbResult(item, "movie")),
    },
    {
      id: "popular-tv",
      title: isFr ? "Séries populaires" : "Popular TV Shows",
      type: "tv",
      items: popularTv.results.map((item) => mapTmdbResult(item, "tv")),
    },
    {
      id: "popular-movie",
      title: isFr ? "Films populaires" : "Popular Movies",
      type: "movie",
      items: popularMovies.results.map((item) => mapTmdbResult(item, "movie")),
    },
  ];

  log("ShowService", "discover result", {
    trendingTv: trendingTv.results.length,
    trendingMovies: trendingMovies.results.length,
    popularTv: popularTv.results.length,
    popularMovies: popularMovies.results.length,
  });

  return { sections };
}

export async function getDiscoverSectionItems(
  sectionId: DiscoverSectionId,
  page: number,
  locale = "en",
): Promise<DiscoverSectionItemsResult> {
  log("ShowService", "discover section items", { sectionId, page, locale });
  const tmdbLanguage = toTmdbLanguage(locale);

  const fetcher: Record<DiscoverSectionId, () => Promise<TmdbPaginatedResult>> = {
    "trending-tv": () => tmdbService.getTrendingTv(10, tmdbLanguage, page),
    "trending-movie": () => tmdbService.getTrendingMovies(10, tmdbLanguage, page),
    "popular-tv": () => tmdbService.getPopularTv(10, tmdbLanguage, page),
    "popular-movie": () => tmdbService.getPopularMovies(10, tmdbLanguage, page),
  };

  const typeMap: Record<DiscoverSectionId, "tv" | "movie"> = {
    "trending-tv": "tv",
    "trending-movie": "movie",
    "popular-tv": "tv",
    "popular-movie": "movie",
  };

  const result = await fetcher[sectionId]();
  const items = result.results.map((item) => mapTmdbResult(item, typeMap[sectionId]));

  return {
    items,
    page: result.page,
    totalPages: result.totalPages,
    hasMore: result.page < result.totalPages,
  };
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
    const knownType = show?.type;
    const tryTvFirst = knownType !== "movie";
    try {
      if (tryTvFirst) {
        const tmdbDetails = await tmdbService.getTvDetails(tmdbId, tmdbLanguage);
        log("ShowService", "details tmdb credits", {
          tmdbId,
          castCount: tmdbDetails.credits?.cast?.length ?? 0,
          crewCount: tmdbDetails.credits?.crew?.length ?? 0,
          createdByCount: tmdbDetails.created_by?.length ?? 0,
        });
        show = await upsertShowFromTmdb("tv", tmdbDetails, normalizedLocale);
        metadataRefreshed = true;
        log("ShowService", "details upserted tv", { tmdbId, title: show.title, castCount: show.cast?.length, crewCount: show.crew?.length });
      } else {
        const movieDetails = await tmdbService.getMovieDetails(tmdbId, tmdbLanguage);
        show = await upsertShowFromTmdb("movie", movieDetails, normalizedLocale);
        metadataRefreshed = true;
        log("ShowService", "details upserted movie", { tmdbId, title: show.title });
      }
    } catch (primaryErr) {
      logError("ShowService", "details primary fetch failed", primaryErr, { tmdbId, tryTvFirst });
      if (!show || (!tryTvFirst && knownType !== "tv")) {
        try {
          const fallbackTmdbDetails = tryTvFirst
            ? await tmdbService.getMovieDetails(tmdbId, tmdbLanguage)
            : await tmdbService.getTvDetails(tmdbId, tmdbLanguage);
          show = tryTvFirst
            ? await upsertShowFromTmdb("movie", fallbackTmdbDetails, normalizedLocale)
            : await upsertShowFromTmdb("tv", fallbackTmdbDetails, normalizedLocale);
          metadataRefreshed = true;
          log("ShowService", "details upserted fallback", { tmdbId, title: show.title, type: show.type });
        } catch (fallbackErr) {
          logError("ShowService", "details fallback fetch failed", fallbackErr, { tmdbId });
          if (!show) {
            throw new ApiError(
              502,
              "EXTERNAL_SERVICES_DOWN",
              "TMDB is unavailable and this show is not cached",
            );
          }
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
      show = await upsertShowFromTmdb("tv", tmdbDetails, normalizedLocale);
    } catch {
      try {
        const movieDetails = await tmdbService.getMovieDetails(tmdbId, tmdbLanguage);
        show = await upsertShowFromTmdb("movie", movieDetails, normalizedLocale);
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

export { syncEpisodesForShow };
