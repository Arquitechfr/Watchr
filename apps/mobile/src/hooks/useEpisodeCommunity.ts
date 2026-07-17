import { useQuery } from "@tanstack/react-query";
import { getEpisodeCommunity } from "../services/shows.service";

export function useEpisodeCommunity(
  tmdbId: number,
  season: number,
  episode: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["episode-community", tmdbId, season, episode],
    queryFn: () => getEpisodeCommunity(tmdbId, season, episode),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
