import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchDiscoverSectionItems, SearchResultItem } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export interface DiscoverSectionData {
  items: SearchResultItem[];
  hasMore: boolean;
}

export function useDiscoverSection(sectionId: string, initialItems: SearchResultItem[]) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useInfiniteQuery<DiscoverSectionData>({
    queryKey: ["shows", "discover", sectionId],
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
