import { useInfiniteQuery } from "@tanstack/react-query";
import { getLibrary, LibraryItem } from "../services/library.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export type LibraryTab = "tv" | "movie" | undefined;

export function useLibrary(type: LibraryTab) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);

  return useInfiniteQuery<{
    data: LibraryItem[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: ["library", type, locale],
    queryFn: ({ pageParam }) => getLibrary(type, (pageParam as number) ?? 1, 20),
    initialPageParam: 1,
    enabled: isHydrated,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });
}
