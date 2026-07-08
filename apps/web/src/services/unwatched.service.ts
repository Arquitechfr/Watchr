import { api } from "./api";

export interface UnwatchedEpisode {
  season: number;
  episode: number;
  name?: string;
  airDate?: string;
}

export interface UnwatchedShow {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  type: "tv";
  status: "watching" | "completed" | "plan_to_watch" | "dropped";
  isEnded: boolean;
  unwatchedEpisodes: UnwatchedEpisode[];
  watchedCount: number;
  totalEpisodes: number;
  network?: string;
}

export interface UnwatchedMovie {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  status: "watching" | "completed" | "plan_to_watch" | "dropped";
  type: "movie";
  genres?: Array<{ id: number; name?: string }>;
  year?: number;
}

export interface UnwatchedTvResponse {
  shows: UnwatchedShow[];
}

export interface UnwatchedMovieResponse {
  movies: UnwatchedMovie[];
}

export async function getUnwatchedShows(): Promise<UnwatchedTvResponse> {
  const response = await api.get<UnwatchedTvResponse>("/tracking/unwatched", { params: { type: "tv" } });
  return response.data;
}

export async function getUnwatchedMovies(): Promise<UnwatchedMovieResponse> {
  const response = await api.get<UnwatchedMovieResponse>("/tracking/unwatched", { params: { type: "movie" } });
  return response.data;
}
