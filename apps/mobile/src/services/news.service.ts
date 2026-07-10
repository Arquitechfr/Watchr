import { log } from "../utils/logger";
import { api } from "./api";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  image?: string;
  aiSummary?: string;
}

export interface NewsSource {
  id: string;
  name: string;
}

export async function getNewsSources(locale: string): Promise<NewsSource[]> {
  log("NewsService", "fetch sources", { locale });
  const response = await api.get<NewsSource[]>("/news/sources", { params: { locale } });
  return response.data;
}

export async function getNews(sourceId: string | undefined, locale: string, limit: number = 30): Promise<NewsArticle[]> {
  log("NewsService", "fetch", { sourceId, locale, limit });
  const response = await api.get<NewsArticle[]>("/news", { params: { source: sourceId, locale, limit } });
  log("NewsService", "articles", { count: response.data.length });
  return response.data;
}

export async function getFilteredNews(locale: string, limit: number = 50): Promise<NewsArticle[]> {
  log("NewsService", "fetch filtered", { locale, limit });
  const response = await api.get<NewsArticle[]>("/news/filtered", { params: { locale, limit } });
  log("NewsService", "filtered articles", { count: response.data.length });
  return response.data;
}
