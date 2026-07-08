import { api } from "./api";

export interface GenreStat {
  id: number;
  name: string;
  count: number;
}

export interface RecentActivityItem {
  commentId: string;
  content: string;
  showId: string;
  showTitle: string;
  tmdbId: number;
  createdAt: string;
}

export interface UserStats {
  commentsCount: number;
  reactionsCount: number;
  likesCount: number;
  tvCount: number;
  movieCount: number;
  episodesWatched: number;
  hoursWatched: number;
  watchStreak: number;
  memberSince: string;
  genreBreakdown: GenreStat[];
  recentActivity: RecentActivityItem[];
}

export async function getUserStats(): Promise<UserStats> {
  const response = await api.get<UserStats>("/auth/me/stats");
  return response.data;
}
