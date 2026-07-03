import { useQuery } from "@tanstack/react-query";
import { getUpcomingEpisodes } from "../services/upcoming.service";

export function useUpcomingEpisodes() {
  return useQuery({
    queryKey: ["upcoming"],
    queryFn: getUpcomingEpisodes,
    staleTime: 5 * 60 * 1000,
  });
}
