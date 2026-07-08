import { useQuery } from "@tanstack/react-query";
import { getDiscoverSections, type DiscoverResult } from "../services/shows.service";

export function useDiscover() {
  return useQuery<DiscoverResult>({
    queryKey: ["shows", "discover"],
    queryFn: () => getDiscoverSections(),
    staleTime: 5 * 60_000,
  });
}
