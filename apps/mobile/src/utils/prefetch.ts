import type { QueryClient } from "@tanstack/react-query";
import { getUnwatchedShows } from "../services/unwatched.service";
import { getUpcomingEpisodes } from "../services/upcoming.service";
import { log } from "./logger";

export async function prefetchSeriesData(queryClient: QueryClient): Promise<void> {
  const results = await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["unwatched", "tv"],
      queryFn: getUnwatchedShows,
      staleTime: 5 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: ["upcoming"],
      queryFn: getUpcomingEpisodes,
      staleTime: 5 * 60 * 1000,
    }),
  ]);

  if (results[0].status === "fulfilled") {
    log("Prefetch", "unwatched tv prefetched");
  } else {
    log("Prefetch", "unwatched tv prefetch failed — will retry in SeriesScreen");
  }
  if (results[1].status === "fulfilled") {
    log("Prefetch", "upcoming prefetched");
  } else {
    log("Prefetch", "upcoming prefetch failed — will retry in SeriesScreen");
  }
}
