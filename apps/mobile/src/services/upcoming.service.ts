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
  today: UpcomingEpisode[];
  thisWeek: UpcomingEpisode[];
  nextWeek: UpcomingEpisode[];
  later: UpcomingEpisode[];
}

export async function getUpcomingEpisodes(): Promise<UpcomingResponse> {
  log("UpcomingService", "fetch");
  const response = await api.get<UpcomingResponse>("/upcoming");
  log("UpcomingService", "response", {
    today: response.data.today.length,
    thisWeek: response.data.thisWeek.length,
    nextWeek: response.data.nextWeek.length,
    later: response.data.later.length,
  });
  return response.data;
}
