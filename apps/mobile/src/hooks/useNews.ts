import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getNews, getNewsSources } from "../services/news.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

const NEWS_QUERY_KEY = "news";

export function useNewsSources() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: [NEWS_QUERY_KEY, "sources", locale],
    queryFn: () => getNewsSources(locale),
    staleTime: 60 * 60 * 1000,
    enabled: isHydrated,
    placeholderData: keepPreviousData,
  });
}

export function useNews(sourceId: string | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: [NEWS_QUERY_KEY, { sourceId, locale }],
    queryFn: () => getNews(sourceId ?? undefined, locale),
    staleTime: 15 * 60 * 1000,
    enabled: isHydrated && !!sourceId,
    placeholderData: keepPreviousData,
  });
}
