import { useQuery } from "@tanstack/react-query";
import { getRecommendations, aiSearchShows } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useRecommendations() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["shows", "recommendations"],
    queryFn: () => getRecommendations(),
    enabled: isHydrated,
    staleTime: 60 * 60 * 1000,
  });
}

export function useAISearch(query: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["shows", "ai-search", query],
    queryFn: () => aiSearchShows(query),
    enabled: isHydrated && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
