import { useQuery } from "@tanstack/react-query";
import { semanticSearchShows, type SemanticSearchResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { useRemoteConfig } from "./useRemoteConfig";

export function useSemanticSearch(query: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  const config = useRemoteConfig();
  return useQuery<SemanticSearchResult>({
    queryKey: ["semantic-search", query, locale],
    queryFn: () => semanticSearchShows(query),
    enabled: isHydrated && config.ai_semantic_search_enabled && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
