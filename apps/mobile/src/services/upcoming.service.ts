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
  isSeriesPremiere: boolean;
  isSeasonPremiere: boolean;
  isFinale: boolean;
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
  const allEpisodes = [...response.data.today, ...response.data.thisWeek, ...response.data.nextWeek, ...response.data.later];
  log("UpcomingService", "response", {
    today: response.data.today.length,
    thisWeek: response.data.thisWeek.length,
    nextWeek: response.data.nextWeek.length,
    later: response.data.later.length,
    episodesByShow: allEpisodes.reduce((acc, ep) => {
      if (!acc[ep.title]) acc[ep.title] = 0;
      acc[ep.title] += 1;
      return acc;
    }, {} as Record<string, number>),
  });
  return response.data;
}
