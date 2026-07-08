import { useQuery } from "@tanstack/react-query";
import { getUpcomingEpisodes, type UpcomingResponse } from "../services/upcoming.service";

export function useUpcomingEpisodes() {
  return useQuery<UpcomingResponse>({
    queryKey: ["upcoming"],
    queryFn: () => getUpcomingEpisodes(),
    staleTime: 60_000,
  });
}
