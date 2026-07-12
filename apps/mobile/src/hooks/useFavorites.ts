import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteShowIds,
  type FavoriteItem,
  type FavoritesResponse,
} from "../services/favorites.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { log } from "../utils/logger";

export type FavoriteType = "tv" | "movie" | undefined;

export function useFavorites(type: FavoriteType) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);

  return useInfiniteQuery<FavoritesResponse>({
    queryKey: ["favorites", type, locale],
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
    onMutate: (showId) => {
      log("useFavorites", "add mutate", { showId });
    },
    onSuccess: () => {
      log("useFavorites", "add success");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
    },
    onError: (err) => {
      log("useFavorites", "add error", { err });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (showId: string) => removeFavorite(showId),
    onMutate: (showId) => {
      log("useFavorites", "remove mutate", { showId });
    },
    onSuccess: () => {
      log("useFavorites", "remove success");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
    },
    onError: (err) => {
      log("useFavorites", "remove error", { err });
    },
  });
}
