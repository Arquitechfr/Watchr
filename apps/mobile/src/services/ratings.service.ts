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

export interface RatingsForShow {
  show: number | null;
  episodes: Array<{ season: number; episode: number; value: number }>;
}

export async function upsertRating(input: UpsertRatingInput): Promise<Rating> {
  log("RatingsService", "upsert", { showId: input.showId, value: input.value, episodeRef: input.episodeRef });
  const response = await api.post<Rating>("/ratings", input);
  log("RatingsService", "upsert response", { id: response.data.id, value: response.data.value });
  return response.data;
}

export async function listRatingsForShow(showId: string): Promise<RatingsForShow> {
  log("RatingsService", "list", { showId });
  const response = await api.get<RatingsForShow>(`/ratings/${showId}`);
  log("RatingsService", "list response", { show: response.data.show, episodes: response.data.episodes.length });
  return response.data;
}

export async function deleteRating(id: string): Promise<void> {
  log("RatingsService", "delete", { id });
  await api.delete(`/ratings/${id}`);
  log("RatingsService", "delete success");
}
