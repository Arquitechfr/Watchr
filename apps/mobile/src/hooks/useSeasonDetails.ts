import { useQuery } from "@tanstack/react-query";
import { getSeasonDetails } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useSeasonDetails(tmdbId: number, seasonNumber: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["shows", "season", tmdbId, seasonNumber],
    queryFn: () => getSeasonDetails(tmdbId, seasonNumber),
    enabled: isHydrated && Number.isFinite(tmdbId) && tmdbId > 0 && Number.isFinite(seasonNumber) && seasonNumber > 0,
    staleTime: 2 * 60 * 1000,
  });
}
