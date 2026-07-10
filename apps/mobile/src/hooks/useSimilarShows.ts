import { useQuery } from "@tanstack/react-query";
import { getSimilarShows, type SimilarShowsResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useSimilarShows(tmdbId: number | undefined) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery<SimilarShowsResult>({
    queryKey: ["similar-shows", tmdbId],
    queryFn: () => getSimilarShows(tmdbId!),
    enabled: isHydrated && Boolean(tmdbId),
    staleTime: 60 * 60 * 1000,
  });
}
