import { BaseParser } from "./baseParser.js";
import { ParsedRecord, ImportSource } from "./types.js";

interface TraktHistoryEntry {
  watched_at?: string;
  type?: string;
  episode?: {
    season?: number;
    number?: number;
    title?: string;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
  show?: {
    title?: string;
    year?: number;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
  movie?: {
    title?: string;
    year?: number;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
}

interface TraktRatingEntry {
  rated_at?: string;
  rating?: number;
  type?: string;
  episode?: {
    season?: number;
    number?: number;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
  show?: {
    title?: string;
    year?: number;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
  movie?: {
    title?: string;
    year?: number;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
}

interface TraktWatchlistEntry {
  listed_at?: string;
  type?: string;
  show?: {
    title?: string;
    year?: number;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
  movie?: {
    title?: string;
    year?: number;
    ids?: { trakt?: number; tmdb?: number; imdb?: string; tvdb?: number };
  };
}

interface TraktExport {
  watched?: TraktHistoryEntry[];
  ratings?: TraktRatingEntry[];
  watchlist?: TraktWatchlistEntry[];
}

export class TraktParser extends BaseParser {
  readonly source: ImportSource = "trakt";

  detect(filePath: string): boolean {
    if (!filePath.endsWith(".json")) return false;
    try {
      const data = this.readJson(filePath) as TraktExport | TraktHistoryEntry[];
      if (Array.isArray(data)) {
        return data.length > 0 && ("watched_at" in data[0] || "show" in data[0] || "movie" in data[0]);
      }
      return !!data && (!!data.watched || !!data.ratings || !!data.watchlist);
    } catch {
      return false;
    }
  }

  parse(filePath: string): ParsedRecord[] {
    const data = this.readJson(filePath) as TraktExport | TraktHistoryEntry[];
    const records: ParsedRecord[] = [];

    let watched: TraktHistoryEntry[] = [];
    let ratings: TraktRatingEntry[] = [];
    let watchlist: TraktWatchlistEntry[] = [];

    if (Array.isArray(data)) {
      watched = data as TraktHistoryEntry[];
    } else {
      watched = data.watched ?? [];
      ratings = data.ratings ?? [];
      watchlist = data.watchlist ?? [];
    }

    for (const entry of watched) {
      records.push(this.parseHistoryEntry(entry));
    }

    for (const entry of ratings) {
      records.push(this.parseRatingEntry(entry));
    }

    for (const entry of watchlist) {
      records.push(this.parseWatchlistEntry(entry));
    }

    return records;
  }

  private parseHistoryEntry(entry: TraktHistoryEntry): ParsedRecord {
    if (entry.show) {
      return {
        title: entry.show.title ?? "",
        year: entry.show.year,
        status: "watching",
        season: entry.episode?.season,
        episode: entry.episode?.number,
        watchedAt: entry.watched_at,
        type: "tv",
        tmdbId: entry.show.ids?.tmdb,
        imdbId: entry.show.ids?.imdb,
        tvdbId: entry.show.ids?.tvdb,
      };
    }
    if (entry.movie) {
      return {
        title: entry.movie.title ?? "",
        year: entry.movie.year,
        status: "completed",
        watchedAt: entry.watched_at,
        type: "movie",
        tmdbId: entry.movie.ids?.tmdb,
        imdbId: entry.movie.ids?.imdb,
        tvdbId: entry.movie.ids?.tvdb,
      };
    }
    return { title: "" };
  }

  private parseRatingEntry(entry: TraktRatingEntry): ParsedRecord {
    const base = {
      title: "",
      rating: entry.rating,
      watchedAt: entry.rated_at,
    };

    if (entry.show) {
      return {
        ...base,
        title: entry.show.title ?? "",
        year: entry.show.year,
        type: "tv" as const,
        tmdbId: entry.show.ids?.tmdb,
        imdbId: entry.show.ids?.imdb,
        tvdbId: entry.show.ids?.tvdb,
        season: entry.episode?.season,
        episode: entry.episode?.number,
      };
    }
    if (entry.movie) {
      return {
        ...base,
        title: entry.movie.title ?? "",
        year: entry.movie.year,
        type: "movie" as const,
        tmdbId: entry.movie.ids?.tmdb,
        imdbId: entry.movie.ids?.imdb,
        tvdbId: entry.movie.ids?.tvdb,
      };
    }
    return base;
  }

  private parseWatchlistEntry(entry: TraktWatchlistEntry): ParsedRecord {
    if (entry.show) {
      return {
        title: entry.show.title ?? "",
        year: entry.show.year,
        status: "plan_to_watch",
        watchedAt: entry.listed_at,
        type: "tv",
        tmdbId: entry.show.ids?.tmdb,
        imdbId: entry.show.ids?.imdb,
        tvdbId: entry.show.ids?.tvdb,
      };
    }
    if (entry.movie) {
      return {
        title: entry.movie.title ?? "",
        year: entry.movie.year,
        status: "plan_to_watch",
        watchedAt: entry.listed_at,
        type: "movie",
        tmdbId: entry.movie.ids?.tmdb,
        imdbId: entry.movie.ids?.imdb,
        tvdbId: entry.movie.ids?.tvdb,
      };
    }
    return { title: "" };
  }
}
