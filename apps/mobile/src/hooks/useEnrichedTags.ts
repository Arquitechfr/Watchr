import { useQuery } from "@tanstack/react-query";
import { getEnrichedTags } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useEnrichedTags(tmdbId: number, type?: "tv" | "movie") {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["shows", "enriched-tags", tmdbId, type],
    queryFn: () => getEnrichedTags(tmdbId, type),
    enabled: isHydrated && Boolean(tmdbId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
