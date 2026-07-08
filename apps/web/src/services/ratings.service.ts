import { api } from "./api";

export interface Rating {
  id: string;
  showId: string;
  userId: string;
  value: number;
  episodeRef?: {
    season: number;
    episode: number;
  };
}

export interface UpsertRatingInput {
  showId: string;
  value: number;
  episodeRef?: {
    season: number;
    episode: number;
  };
}

export interface CommunityRating {
  average: number;
  count: number;
}

export interface CommunityRatings {
  show: CommunityRating | null;
  episodes: Array<{ season: number; episode: number; average: number; count: number }>;
}

export interface RatingsForShow {
  user: {
    show: number | null;
    episodes: Array<{ season: number; episode: number; value: number }>;
  };
  community: CommunityRatings;
}

export interface UpsertRatingResponse {
  rating: Rating;
  community: CommunityRatings;
}

export async function upsertRating(input: UpsertRatingInput): Promise<UpsertRatingResponse> {
  const response = await api.post<UpsertRatingResponse>("/ratings", input);
  return response.data;
}

export async function listRatingsForShow(showId: string): Promise<RatingsForShow> {
  const response = await api.get<RatingsForShow>(`/ratings/${showId}`);
  return response.data;
}

export async function deleteRating(id: string): Promise<void> {
  await api.delete(`/ratings/${id}`);
}
