import { useQuery } from "@tanstack/react-query";
import { getEpisodeSummary } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { useRemoteConfig } from "./useRemoteConfig";

export function useEpisodeSummary(tmdbId: number, seasonNumber: number, episodeNumber: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  const config = useRemoteConfig();
  return useQuery({
    queryKey: ["shows", "episode-summary", tmdbId, seasonNumber, episodeNumber, locale],
    queryFn: () => getEpisodeSummary(tmdbId, seasonNumber, episodeNumber),
    enabled: isHydrated && config.ai_episode_summary_enabled && Number.isFinite(tmdbId) && tmdbId > 0 && Number.isFinite(seasonNumber) && seasonNumber > 0 && Number.isFinite(episodeNumber) && episodeNumber > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
