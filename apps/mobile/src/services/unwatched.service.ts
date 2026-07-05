import { log } from "../utils/logger";
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
}

export interface UnwatchedMovie {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  status: "watching" | "completed" | "plan_to_watch" | "dropped";
  type: "movie";
}

export interface UnwatchedTvResponse {
  shows: UnwatchedShow[];
}

export interface UnwatchedMovieResponse {
  movies: UnwatchedMovie[];
}

export async function getUnwatchedShows(): Promise<UnwatchedTvResponse> {
  log("UnwatchedService", "fetch shows");
  const response = await api.get<UnwatchedTvResponse>("/tracking/unwatched", { params: { type: "tv" } });
  log("UnwatchedService", "shows response", {
    count: response.data.shows.length,
    shows: response.data.shows.map((s) => ({
      showId: s.showId,
      title: s.title,
      status: s.status,
      isEnded: s.isEnded,
      unwatchedCount: s.unwatchedEpisodes.length,
      lastUnwatched: s.unwatchedEpisodes[0] ?? null,
    })),
  });
  return response.data;
}

export async function getUnwatchedMovies(): Promise<UnwatchedMovieResponse> {
  log("UnwatchedService", "fetch movies");
  const response = await api.get<UnwatchedMovieResponse>("/tracking/unwatched", { params: { type: "movie" } });
  log("UnwatchedService", "movies response", { count: response.data.movies.length });
  return response.data;
}
