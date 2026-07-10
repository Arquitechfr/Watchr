import { useQuery } from "@tanstack/react-query";
import { semanticSearchShows, type SemanticSearchResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useSemanticSearch(query: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery<SemanticSearchResult>({
    queryKey: ["semantic-search", query],
    queryFn: () => semanticSearchShows(query),
    enabled: isHydrated && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
