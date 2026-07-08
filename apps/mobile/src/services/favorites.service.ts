import { api } from "./api";

export interface FavoriteItem {
  id: string;
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  type: "tv" | "movie";
  createdAt: string;
}

export interface FavoritesResponse {
  data: FavoriteItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getFavorites(
  type?: "tv" | "movie",
  page = 1,
  limit = 20,
): Promise<FavoritesResponse> {
  const params: { type?: "tv" | "movie"; page: number; limit: number } = { page, limit };
  if (type) {
    params.type = type;
  }
  const response = await api.get<FavoritesResponse>("/favorites", { params });
  return response.data;
}

export async function addFavorite(showId: string): Promise<{ id: string; showId: string }> {
  const response = await api.post<{ id: string; showId: string }>(`/favorites/${showId}`);
  return response.data;
}

export async function removeFavorite(showId: string): Promise<void> {
  await api.delete(`/favorites/${showId}`);
}

export async function getFavoriteShowIds(): Promise<string[]> {
  const response = await api.get<{ showIds: string[] }>("/favorites/ids");
  return response.data.showIds;
}
