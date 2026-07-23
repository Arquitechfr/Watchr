import { useQuery } from "@tanstack/react-query";
import { getSimilarShows, type SimilarShowsResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { useRemoteConfig } from "./useRemoteConfig";

export function useSimilarShows(tmdbId: number | undefined) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  const config = useRemoteConfig();
  return useQuery<SimilarShowsResult>({
    queryKey: ["similar-shows", tmdbId, locale],
    queryFn: () => getSimilarShows(tmdbId!),
    enabled: isHydrated && config.ai_similar_shows_enabled && Number.isFinite(tmdbId) && tmdbId! > 0,
    staleTime: 60 * 60 * 1000,
  });
}
