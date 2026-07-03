import { useQuery } from "@tanstack/react-query";
import { getShowDetails } from "../services/shows.service";

export function useShowDetails(tmdbId: number) {
  const validTmdbId = Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : 0;
  return useQuery({
    queryKey: ["shows", "details", validTmdbId],
    queryFn: () => getShowDetails(validTmdbId),
    enabled: validTmdbId > 0,
    staleTime: 10 * 60 * 1000,
  });
}
