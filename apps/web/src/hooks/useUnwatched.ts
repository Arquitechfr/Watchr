import { useQuery } from "@tanstack/react-query";
import { getUnwatchedShows, getUnwatchedMovies, type UnwatchedTvResponse, type UnwatchedMovieResponse } from "../services/unwatched.service";

export function useUnwatchedShows() {
  return useQuery<UnwatchedTvResponse>({
    queryKey: ["tracking", "unwatched", "tv"],
    queryFn: (): Promise<UnwatchedTvResponse> => getUnwatchedShows(),
    staleTime: 30_000,
  });
}

export function useUnwatchedMovies() {
  return useQuery<UnwatchedMovieResponse>({
    queryKey: ["tracking", "unwatched", "movie"],
    queryFn: (): Promise<UnwatchedMovieResponse> => getUnwatchedMovies(),
    staleTime: 30_000,
  });
}
