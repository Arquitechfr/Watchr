import { log } from "../utils/logger";
import { api } from "./api";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  image?: string;
}

export interface NewsSource {
  id: string;
  name: string;
}

export async function getNewsSources(): Promise<NewsSource[]> {
  log("NewsService", "fetch sources");
  const response = await api.get<NewsSource[]>("/news/sources");
  return response.data;
}

export async function getNews(sourceId: string = "allocine-news", limit: number = 30): Promise<NewsArticle[]> {
  log("NewsService", "fetch", { sourceId, limit });
  const response = await api.get<NewsArticle[]>("/news", { params: { source: sourceId, limit } });
  log("NewsService", "articles", { count: response.data.length });
  return response.data;
}
