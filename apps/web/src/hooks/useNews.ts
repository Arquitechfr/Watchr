import { useQuery } from "@tanstack/react-query";
import { getNews, getNewsSources, type NewsArticle, type NewsSource } from "../services/news.service";

export function useNewsSources() {
  return useQuery<NewsSource[]>({
    queryKey: ["news", "sources"],
    queryFn: () => getNewsSources(),
    staleTime: 10 * 60_000,
  });
}

export function useNews(sourceId: string | null) {
  return useQuery<NewsArticle[]>({
    queryKey: ["news", sourceId],
    queryFn: () => getNews(sourceId ?? undefined),
    staleTime: 60_000,
  });
}
