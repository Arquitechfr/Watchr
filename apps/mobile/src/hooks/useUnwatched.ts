import { useQuery } from "@tanstack/react-query";
import { getUnwatchedMovies, getUnwatchedShows, MovieCategory } from "../services/unwatched.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

const UNWATCHED_QUERY_KEY = "unwatched";

export function useUnwatchedShows() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: [UNWATCHED_QUERY_KEY, "tv", locale],
    queryFn: getUnwatchedShows,
    staleTime: 5 * 60 * 1000,
    enabled: isHydrated,
  });
}

export function useUnwatchedMovies(category?: MovieCategory) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: [UNWATCHED_QUERY_KEY, "movie", locale, category ?? "all"],
    queryFn: () => getUnwatchedMovies(category),
    staleTime: 5 * 60 * 1000,
    enabled: isHydrated,
  });
}
