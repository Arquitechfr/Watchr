import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchDiscoverSectionItems } from "../services/shows.service";

export function useDiscoverSection(sectionId: string | null) {
  return useInfiniteQuery({
    queryKey: ["shows", "discover", sectionId],
    queryFn: ({ pageParam }) => fetchDiscoverSectionItems(sectionId!, pageParam),
    enabled: !!sectionId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });
}
