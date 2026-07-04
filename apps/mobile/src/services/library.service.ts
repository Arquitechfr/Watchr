import { api } from "./api";

export interface LibraryItem {
  id: string;
  showId: string;
  userId: string;
  status: "watching" | "completed" | "plan_to_watch" | "dropped";
  watchedEpisodes: Array<{ season: number; episode: number }>;
  currentSeason?: number;
  currentEpisode?: number;
  show: {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    type: "tv" | "movie";
  };
  createdAt: string;
  updatedAt: string;
}

export interface LibraryResponse {
  data: LibraryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getLibrary(
  type: "tv" | "movie" | undefined,
  page = 1,
  limit = 20,
): Promise<LibraryResponse> {
  const params: { type?: "tv" | "movie"; page: number; limit: number } = {
    page,
    limit,
  };
  if (type) {
    params.type = type;
  }
  const response = await api.get<LibraryResponse>("/tracking/library", { params });
  return response.data;
}
