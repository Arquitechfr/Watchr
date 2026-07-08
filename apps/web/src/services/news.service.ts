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
  const response = await api.get<NewsSource[]>("/news/sources");
  return response.data;
}

export async function getNews(sourceId?: string, limit: number = 30): Promise<NewsArticle[]> {
  const response = await api.get<NewsArticle[]>("/news", { params: { source: sourceId, limit } });
  return response.data;
}
