import { useQuery } from "@tanstack/react-query";
import { getSeasonDetails } from "../services/shows.service";

export function useSeasonDetails(tmdbId: number, seasonNumber: number) {
  return useQuery({
    queryKey: ["shows", "season", tmdbId, seasonNumber],
    queryFn: () => getSeasonDetails(tmdbId, seasonNumber),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0 && Number.isFinite(seasonNumber),
    staleTime: 5 * 60_000,
  });
}
