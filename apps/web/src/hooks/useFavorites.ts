import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteShowIds,
  type FavoritesResponse,
  type FavoriteItem,
} from "../services/favorites.service";
import { useAuthStore } from "../store/authStore";

export type FavoriteType = "tv" | "movie" | undefined;

export function useFavorites(type: FavoriteType) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useInfiniteQuery<FavoritesResponse>({
    queryKey: ["favorites", type],
    queryFn: ({ pageParam }) => getFavorites(type, (pageParam as number) ?? 1, 20),
    initialPageParam: 1,
    enabled: isHydrated,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });
}

export function useFavoriteShowIds() {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useQuery<string[]>({
    queryKey: ["favorite-ids"],
    queryFn: getFavoriteShowIds,
    enabled: isHydrated,
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
