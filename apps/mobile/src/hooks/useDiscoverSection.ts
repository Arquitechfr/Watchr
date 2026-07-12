import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchDiscoverSectionItems, SearchResultItem } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export interface DiscoverSectionData {
  items: SearchResultItem[];
  hasMore: boolean;
}

export function useDiscoverSection(sectionId: string, initialItems: SearchResultItem[]) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);

  return useInfiniteQuery<DiscoverSectionData>({
    queryKey: ["shows", "discover", sectionId, locale],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      if (page === 1) {
        return { items: initialItems, hasMore: initialItems.length >= 10 };
      }
      const result = await fetchDiscoverSectionItems(sectionId, page);
      return { items: result.items, hasMore: result.hasMore };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length + 1;
    },
    enabled: isHydrated,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
