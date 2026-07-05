import { useQuery } from "@tanstack/react-query";
import { getNews, getNewsSources } from "../services/news.service";
import { useAuthStore } from "../store/authStore";

const NEWS_QUERY_KEY = "news";

export function useNewsSources() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [NEWS_QUERY_KEY, "sources"],
    queryFn: getNewsSources,
    staleTime: 60 * 60 * 1000,
    enabled: isHydrated,
  });
}

export function useNews(sourceId: string | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [NEWS_QUERY_KEY, { sourceId }],
    queryFn: () => getNews(sourceId ?? undefined),
    staleTime: 15 * 60 * 1000,
    enabled: isHydrated && !!sourceId,
  });
}
