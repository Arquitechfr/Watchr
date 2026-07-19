import type { QueryClient } from "@tanstack/react-query";
import { getUnwatchedShows } from "../services/unwatched.service";
import { getUpcomingEpisodes } from "../services/upcoming.service";
import { log } from "./logger";
import { useLocaleStore } from "../store/localeStore";

export async function prefetchSeriesData(queryClient: QueryClient): Promise<void> {
  const locale = useLocaleStore.getState().locale;
  const results = await Promise.allSettled([
    queryClient.fetchQuery({
      queryKey: ["unwatched", "tv", locale],
      queryFn: getUnwatchedShows,
      staleTime: 5 * 60 * 1000,
    }),
    queryClient.fetchQuery({
      queryKey: ["upcoming", locale],
      queryFn: getUpcomingEpisodes,
      staleTime: 5 * 60 * 1000,
    }),
  ]);

  if (results[0].status === "fulfilled") {
    log("Prefetch", "unwatched tv prefetched");
  } else {
    log("Prefetch", "unwatched tv prefetch failed — will retry in SeriesScreen", results[0].reason);
    queryClient.removeQueries({ queryKey: ["unwatched", "tv", locale] });
  }
  if (results[1].status === "fulfilled") {
    log("Prefetch", "upcoming prefetched");
  } else {
    log("Prefetch", "upcoming prefetch failed — will retry in SeriesScreen", results[1].reason);
    queryClient.removeQueries({ queryKey: ["upcoming", locale] });
  }
}
