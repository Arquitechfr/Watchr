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
  network?: string;
}

export interface UpcomingResponse {
  today: UpcomingEpisode[];
  thisWeek: UpcomingEpisode[];
  nextWeek: UpcomingEpisode[];
  later: UpcomingEpisode[];
}

export async function getUpcomingEpisodes(): Promise<UpcomingResponse> {
  const response = await api.get<UpcomingResponse>("/upcoming");
  return response.data;
}
