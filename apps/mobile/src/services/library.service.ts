import { api } from "./api";
import { WatchStatus } from "./tracking.service";

export interface LibraryItem {
  id: string;
  showId: string;
  userId: string;
  status: WatchStatus;
  watchedEpisodes: Array<{ season: number; episode: number }>;
  currentSeason?: number;
  currentEpisode?: number;
  show: {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    type: "tv" | "movie";
    totalEpisodes?: number;
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
  status?: WatchStatus,
): Promise<LibraryResponse> {
  const params: { type?: "tv" | "movie"; page: number; limit: number; status?: WatchStatus } = {
    page,
    limit,
  };
  if (type) {
    params.type = type;
  }
  if (status) {
    params.status = status;
  }
  const response = await api.get<LibraryResponse>("/tracking/library", { params });
  return response.data;
}
