import { useQuery } from "@tanstack/react-query";
import { getEpisodeSummary } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useEpisodeSummary(tmdbId: number, seasonNumber: number, episodeNumber: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["shows", "episode-summary", tmdbId, seasonNumber, episodeNumber],
    queryFn: () => getEpisodeSummary(tmdbId, seasonNumber, episodeNumber),
    enabled: isHydrated && Number.isFinite(tmdbId) && tmdbId > 0 && Number.isFinite(seasonNumber) && seasonNumber > 0 && Number.isFinite(episodeNumber) && episodeNumber > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
