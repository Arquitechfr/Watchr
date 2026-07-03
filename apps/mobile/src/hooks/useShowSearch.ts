import { useQuery } from "@tanstack/react-query";
import { searchShows } from "../services/shows.service";

export function useShowSearch(query: string) {
  return useQuery({
    queryKey: ["shows", "search", query],
    queryFn: () => searchShows(query),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
