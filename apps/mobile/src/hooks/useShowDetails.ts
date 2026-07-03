import { useQuery } from "@tanstack/react-query";
import { getShowDetails } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useShowDetails(tmdbId: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const validTmdbId = Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : 0;
  return useQuery({
    queryKey: ["shows", "details", validTmdbId],
    queryFn: () => getShowDetails(validTmdbId),
    enabled: isHydrated && validTmdbId > 0,
    staleTime: 10 * 60 * 1000,
  });
}
