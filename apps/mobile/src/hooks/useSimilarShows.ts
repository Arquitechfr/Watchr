import { useQuery } from "@tanstack/react-query";
import { getSimilarShows, type SimilarShowsResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useSimilarShows(tmdbId: number | undefined) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery<SimilarShowsResult>({
    queryKey: ["similar-shows", tmdbId, locale],
    queryFn: () => getSimilarShows(tmdbId!),
    enabled: isHydrated && Number.isFinite(tmdbId) && tmdbId! > 0,
    staleTime: 60 * 60 * 1000,
  });
}
