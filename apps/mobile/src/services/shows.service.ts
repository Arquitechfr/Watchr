import { log } from "../utils/logger";
import { api, getApiBaseUrl } from "./api";

export interface SearchResult {
  results: SearchResultItem[];
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

export interface SearchResultItem {
  tmdbId?: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  firstAirDate?: string;
  source: "tmdb";
}

export interface ShowDetails {
  id: string;
  tmdbId: number;
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
  cast?: CastMember[];
  crew?: CrewMember[];
  genres?: Genre[];
  status?: string;
  voteAverage?: number;
  voteCount?: number;
  runtime?: number;
  networks?: Network[];
  productionCompanies?: ProductionCompany[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  lastSyncedAt?: string;
  lastEpisodesSyncedAt?: string;
}

export interface Season {
  seasonNumber: number;
  episodeCount: number;
  episodes?: Episode[];
}

export interface SeasonDetails {
  tmdbId: number;
  seasonNumber: number;
  episodes: Episode[];
}

export interface Episode {
  episodeNumber: number;
  name?: string;
  overview?: string;
  stillPath?: string;
  airDate?: string;
  runtime?: number;
}

export interface CastMember {
  id: number;
  name?: string;
  character?: string;
  profilePath?: string;
  order?: number;
}

export interface CrewMember {
  id: number;
  name?: string;
  job?: string;
  department?: string;
  profilePath?: string;
}

export interface Genre {
  id: number;
  name?: string;
}

export interface Network {
  id: number;
  name?: string;
  logoPath?: string;
}

export interface ProductionCompany {
  id: number;
  name?: string;
  logoPath?: string;
}

export async function searchShows(query: string): Promise<SearchResult> {
  log("ShowsService", "search", { query });
  const response = await api.get<SearchResult>("/shows/search", { params: { q: query } });
  log("ShowsService", "search results", { count: response.data.results.length });
  return response.data;
}

export async function getShowDetails(tmdbId: number): Promise<ShowDetails> {
  log("ShowsService", "details", { tmdbId });
  const response = await api.get<ShowDetails>(`/shows/${tmdbId}`);
  log("ShowsService", "details response", { title: response.data.title, type: response.data.type });
  return response.data;
}

export async function getSeasonDetails(tmdbId: number, seasonNumber: number): Promise<SeasonDetails> {
  log("ShowsService", "season details", { tmdbId, seasonNumber });
  const response = await api.get<SeasonDetails>(`/shows/${tmdbId}/seasons/${seasonNumber}`);
  log("ShowsService", "season details response", { count: response.data.episodes.length });
  return response.data;
}

export function getPosterUrl(path?: string, size: number = 200): string | undefined {
  if (!path) return undefined;
  return `${getApiBaseUrl()}/images/poster/w${size}${path}`;
}

export function getStillUrl(path?: string, size: number = 300): string | undefined {
  if (!path) return undefined;
  return `${getApiBaseUrl()}/images/still/w${size}${path}`;
}

export function getProfileUrl(path?: string, size: number = 200): string | undefined {
  if (!path) return undefined;
  return `${getApiBaseUrl()}/images/profile/w${size}${path}`;
}

export async function getDiscoverSections(): Promise<DiscoverResult> {
  log("ShowsService", "discover");
  const response = await api.get<DiscoverResult>("/shows/discover");
  log("ShowsService", "discover response", { sectionCount: response.data.sections.length });
  return response.data;
}

export interface DiscoverSectionItemsResult {
  items: SearchResultItem[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export async function fetchDiscoverSectionItems(sectionId: string, page: number): Promise<DiscoverSectionItemsResult> {
  log("ShowsService", "discover section items", { sectionId, page });
  const response = await api.get<DiscoverSectionItemsResult>(`/shows/discover/${sectionId}`, {
    params: { page },
  });
  log("ShowsService", "discover section items response", { sectionId, count: response.data.items.length });
  return response.data;
}
