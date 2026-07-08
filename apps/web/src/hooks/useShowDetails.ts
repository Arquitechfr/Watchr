import { useQuery } from "@tanstack/react-query";
import { getShowDetails } from "../services/shows.service";

export function useShowDetails(tmdbId: number) {
  return useQuery({
    queryKey: ["shows", "details", tmdbId],
    queryFn: () => getShowDetails(tmdbId),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0,
    staleTime: 5 * 60_000,
  });
}
