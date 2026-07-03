import { log } from "../utils/logger";
import { api } from "./api";

export interface SearchResult {
  tmdb: SearchResultItem[];
  tvdb: SearchResultItem[];
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

export interface ShowDetails {
  id: string;
  tmdbId: number;
  tvdbId?: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  firstAirDate?: string;
  seasons: Season[];
  nextEpisodeToAir?: {
    season: number;
    episode: number;
    airDate: string;
  };
  lastSyncedAt?: string;
  lastEpisodesSyncedAt?: string;
}

export interface Season {
  seasonNumber: number;
  episodeCount: number;
  episodes: Episode[];
}

export interface Episode {
  episodeNumber: number;
  name?: string;
  overview?: string;
  stillPath?: string;
  airDate?: string;
}

export async function searchShows(query: string): Promise<SearchResult> {
  log("ShowsService", "search", { query });
  const response = await api.get<SearchResult>("/shows/search", { params: { q: query } });
  log("ShowsService", "search results", { tmdb: response.data.tmdb.length, tvdb: response.data.tvdb.length });
  return response.data;
}

export async function getShowDetails(tmdbId: number): Promise<ShowDetails> {
  log("ShowsService", "details", { tmdbId });
  const response = await api.get<ShowDetails>(`/shows/${tmdbId}`);
  log("ShowsService", "details response", { title: response.data.title, type: response.data.type });
  return response.data;
}

export function getPosterUrl(path?: string, size: number = 200): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/w${size}${path}`;
}

export function getStillUrl(path?: string, size: number = 300): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/w${size}${path}`;
}
