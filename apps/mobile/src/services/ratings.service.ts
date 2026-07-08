import { log } from "../utils/logger";
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
  log("RatingsService", "upsert", { showId: input.showId, value: input.value, episodeRef: input.episodeRef });
  const response = await api.post<UpsertRatingResponse>("/ratings", input);
  log("RatingsService", "upsert response", { id: response.data.rating.id, value: response.data.rating.value });
  return response.data;
}

export async function listRatingsForShow(showId: string): Promise<RatingsForShow> {
  log("RatingsService", "list", { showId });
  const response = await api.get<RatingsForShow>(`/ratings/${showId}`);
  log("RatingsService", "list response", {
    userShow: response.data.user.show,
    userEpisodes: response.data.user.episodes.length,
    communityShow: response.data.community.show,
  });
  return response.data;
}

export async function deleteRating(id: string): Promise<void> {
  log("RatingsService", "delete", { id });
  await api.delete(`/ratings/${id}`);
  log("RatingsService", "delete success");
}
