import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchDiscoverSectionItems, SearchResultItem, DiscoverSectionItemsResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

const SECTION_IDS = ["trending-tv", "trending-movie", "popular-tv", "popular-movie"] as const;

export interface OnboardingDiscoverPage {
  items: SearchResultItem[];
  hasMore: boolean;
}

export function useOnboardingDiscover() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);

  return useInfiniteQuery<OnboardingDiscoverPage>({
    queryKey: ["onboarding-discover", locale],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const results = await Promise.all(
        SECTION_IDS.map((sectionId) =>
          fetchDiscoverSectionItems(sectionId, page).catch(
            (): DiscoverSectionItemsResult => ({
              items: [],
              page,
              totalPages: 0,
              hasMore: false,
            }),
          ),
        ),
      );

      const seen = new Set<number>();
      const items: SearchResultItem[] = [];
      for (const result of results) {
        for (const item of result.items) {
          if (item.tmdbId !== undefined && !seen.has(item.tmdbId)) {
            seen.add(item.tmdbId);
            items.push(item);
          }
        }
      }

      const hasMore = results.some((r) => r.hasMore);
      return { items, hasMore };
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
