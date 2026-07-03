import { log } from "../utils/logger";
import { api } from "./api";

export interface UpcomingEpisode {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  season: number;
  episode: number;
  name?: string;
  airDate: string;
}

export interface UpcomingResponse {
  thisWeek: UpcomingEpisode[];
  upcoming: UpcomingEpisode[];
}

export async function getUpcomingEpisodes(): Promise<UpcomingResponse> {
  log("UpcomingService", "fetch");
  const response = await api.get<UpcomingResponse>("/upcoming");
  log("UpcomingService", "response", {
    thisWeek: response.data.thisWeek.length,
    upcoming: response.data.upcoming.length,
  });
  return response.data;
}
