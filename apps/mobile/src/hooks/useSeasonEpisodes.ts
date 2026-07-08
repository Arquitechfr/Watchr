import { useQuery } from "@tanstack/react-query";
import { getSeasonDetails } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useSeasonEpisodes(tmdbId: number, seasonNumber: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const validTmdbId = Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : 0;
  const validSeasonNumber = Number.isFinite(seasonNumber) && seasonNumber > 0 ? seasonNumber : 0;
  return useQuery({
    queryKey: ["shows", "season", validTmdbId, validSeasonNumber],
    queryFn: () => getSeasonDetails(validTmdbId, validSeasonNumber),
    enabled: isHydrated && validTmdbId > 0 && validSeasonNumber > 0,
    staleTime: 2 * 60 * 1000,
  });
}
