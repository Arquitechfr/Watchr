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

export interface AiInsight {
  type: "positive" | "informational" | "suggestion";
  title: string;
  message: string;
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
  watchedDates: string[];
  aiInsights?: AiInsight[];
}

export async function getUserStats(): Promise<UserStats> {
  const response = await api.get<UserStats>("/auth/me/stats");
  return response.data;
}

export interface YearInReviewData {
  year: number;
  totalShows: number;
  totalEpisodesWatched: number;
  topShows: { title: string; episodesWatched: number }[];
  totalComments: number;
  totalRatings: number;
  averageRating: number;
  favoriteGenre: string;
  longestStreak: number;
}

export interface YearInReviewResult {
  data: YearInReviewData;
  aiSummary: string;
  highlights: string[];
  source: "ai" | "fallback";
}

export async function getYearInReview(year?: number): Promise<YearInReviewResult> {
  const response = await api.get<YearInReviewResult>("/auth/me/year-in-review", {
    params: year ? { year } : undefined,
  });
  return response.data;
}
