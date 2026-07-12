import { useQuery } from "@tanstack/react-query";
import { getRecommendations, aiSearchShows } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useRecommendations() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: ["shows", "recommendations", locale],
    queryFn: () => getRecommendations(),
    enabled: isHydrated,
    staleTime: 60 * 60 * 1000,
  });
}

export function useAISearch(query: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: ["shows", "ai-search", query, locale],
    queryFn: () => aiSearchShows(query),
    enabled: isHydrated && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
