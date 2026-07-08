import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFavorites, addFavorite, removeFavorite, type FavoritesResponse } from "../services/favorites.service";

export function useFavorites(type?: "tv" | "movie", page: number = 1, limit: number = 20) {
  return useQuery<FavoritesResponse>({
    queryKey: ["favorites", type, page, limit],
    queryFn: () => getFavorites(type, page, limit),
    staleTime: 30_000,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (showId: string) => addFavorite(showId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (showId: string) => removeFavorite(showId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
