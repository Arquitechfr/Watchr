export interface TvTimeStats {
  seriesFollowCount: number;
  movieWatchCount: number;
  epWatchCount: number;
  totalSeriesRuntimeSec: number;
  totalMoviesRuntimeSec: number;
}

export interface TvTimeSeriesEntry {
  sId: string;
  seriesNameRaw: string;
  title: string;
  year: number | null;
  isFollowed: boolean;
  isForLater: boolean;
  isArchived: boolean;
  epWatchCount: number;
  followedAt: Date | null;
  mostRecentEpWatched: Record<string, string> | null;
}

export interface TvTimeEpisodeEntry {
  sId: string;
  seriesNameRaw: string;
  title: string;
  year: number | null;
  seasonNumber: number;
  episodeNumber: number;
  epId: string;
  isSpecial: boolean;
  isRewatch: boolean;
  createdAt: Date;
}

export interface TvTimeMovieEntry {
  sId: string;
  seriesNameRaw: string;
  title: string;
  year: number | null;
  epId: string;
  isRewatch: boolean;
  createdAt: Date;
}

export interface ParsedTvTimeExport {
  stats: TvTimeStats | null;
  series: TvTimeSeriesEntry[];
  episodes: TvTimeEpisodeEntry[];
  movies: TvTimeMovieEntry[];
  skippedRows: number;
}

export interface TmdbMatchCandidate {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  confidenceScore: number;
}

export interface TmdbMatchResult {
  sourceTitle: string;
  sourceYear: number | null;
  tvtimeInternalId: string;
  mediaType: "tv" | "movie";
  matched: boolean;
  bestMatch: TmdbMatchCandidate | null;
  candidates: TmdbMatchCandidate[];
}
