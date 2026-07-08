import { useQuery } from "@tanstack/react-query";
import { searchShows, type SearchResult } from "../services/shows.service";
import { useDebounce } from "./useDebounce";

export function useShowSearch(query: string) {
  const debouncedQuery = useDebounce(query, 400);

  return useQuery<SearchResult>({
    queryKey: ["shows", "search", debouncedQuery],
    queryFn: () => searchShows(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 60_000,
  });
}
