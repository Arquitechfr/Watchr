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
  backdropPath?: string;
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

export function getBackdropUrl(path?: string, size: number = 780): string | undefined {
  if (!path) return undefined;
  return `${getApiBaseUrl()}/images/backdrop/w${size}${path}`;
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

export interface RecommendationItem {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface RecommendationResult {
  recommendations: RecommendationItem[];
  source: "ai" | "fallback";
}

export async function getRecommendations(): Promise<RecommendationResult> {
  log("ShowsService", "recommendations");
  const response = await api.get<RecommendationResult>("/shows/recommendations");
  log("ShowsService", "recommendations response", { count: response.data.recommendations.length, source: response.data.source });
  return response.data;
}

export interface AISearchResult {
  results: SearchResultItem[];
  source: "ai" | "fallback";
  parsedQuery?: {
    keywords: string[];
    genres: string[];
    yearRange?: [number, number];
  };
}

export async function aiSearchShows(query: string): Promise<AISearchResult> {
  log("ShowsService", "ai-search", { query });
  const response = await api.get<AISearchResult>("/shows/ai-search", { params: { q: query } });
  log("ShowsService", "ai-search response", { count: response.data.results.length, source: response.data.source });
  return response.data;
}

export interface MoodRecommendation {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface MoodRecommendationResult {
  recommendations: MoodRecommendation[];
  source: "ai" | "fallback";
}

export async function getMoodRecommendations(mood: string): Promise<MoodRecommendationResult> {
  log("ShowsService", "mood-recommendations", { mood });
  const response = await api.get<MoodRecommendationResult>("/shows/mood-recommendations", { params: { mood } });
  log("ShowsService", "mood-recommendations response", { count: response.data.recommendations.length, source: response.data.source });
  return response.data;
}

export interface SimilarShow {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface SimilarShowsResult {
  shows: SimilarShow[];
  source: "ai" | "fallback";
}

export async function getSimilarShows(tmdbId: number): Promise<SimilarShowsResult> {
  log("ShowsService", "similar-shows", { tmdbId });
  const response = await api.get<SimilarShowsResult>(`/shows/${tmdbId}/similar`);
  log("ShowsService", "similar-shows response", { count: response.data.shows.length, source: response.data.source });
  return response.data;
}

export interface OnboardingSuggestion {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
  overview?: string;
  reason: string;
}

export interface OnboardingSuggestionResult {
  suggestions: OnboardingSuggestion[];
  source: "ai" | "fallback";
}

export async function getOnboardingSuggestions(preferences: {
  genres?: string[];
  mood?: string;
  type?: "tv" | "movie" | "both";
}): Promise<OnboardingSuggestionResult> {
  log("ShowsService", "onboarding-suggestions", preferences);
  const response = await api.post<OnboardingSuggestionResult>("/shows/onboarding-suggestions", preferences);
  log("ShowsService", "onboarding-suggestions response", { count: response.data.suggestions.length, source: response.data.source });
  return response.data;
}

export interface SemanticSearchResult {
  results: SearchResultItem[];
  source: "ai" | "fallback";
  similarities?: number[];
}

export async function semanticSearchShows(query: string): Promise<SemanticSearchResult> {
  log("ShowsService", "semantic-search", { query });
  const response = await api.get<SemanticSearchResult>("/shows/semantic-search", { params: { q: query } });
  log("ShowsService", "semantic-search response", { count: response.data.results.length, source: response.data.source });
  return response.data;
}

export interface EpisodeSummaryResult {
  summary: string;
  source: "ai" | "tmdb";
}

export async function getEpisodeSummary(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<EpisodeSummaryResult> {
  log("ShowsService", "episode-summary", { tmdbId, seasonNumber, episodeNumber });
  const response = await api.get<EpisodeSummaryResult>(
    `/shows/${tmdbId}/seasons/${seasonNumber}/episodes/${episodeNumber}/summary`,
  );
  return response.data;
}

export interface EnrichedTagsResult {
  tags: string[];
  source: "ai" | "tmdb";
}

export async function getEnrichedTags(tmdbId: number, type?: "tv" | "movie"): Promise<EnrichedTagsResult> {
  log("ShowsService", "enriched-tags", { tmdbId, type });
  const response = await api.get<EnrichedTagsResult>(`/shows/${tmdbId}/tags`, {
    params: type ? { type } : undefined,
  });
  return response.data;
}
