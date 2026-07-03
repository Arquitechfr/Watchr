import { useQuery } from "@tanstack/react-query";
import { getUnwatchedMovies, getUnwatchedShows } from "../services/unwatched.service";
import { useAuthStore } from "../store/authStore";

const UNWATCHED_QUERY_KEY = "unwatched";

export function useUnwatchedShows() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [UNWATCHED_QUERY_KEY, "tv"],
    queryFn: getUnwatchedShows,
    staleTime: 5 * 60 * 1000,
    enabled: isHydrated,
  });
}

export function useUnwatchedMovies() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [UNWATCHED_QUERY_KEY, "movie"],
    queryFn: getUnwatchedMovies,
    staleTime: 5 * 60 * 1000,
    enabled: isHydrated,
  });
}
