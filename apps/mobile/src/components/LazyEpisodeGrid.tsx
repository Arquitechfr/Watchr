import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { EpisodeGrid } from "./EpisodeGrid";
import { Season, Episode, getSeasonDetails } from "../services/shows.service";

interface LazyEpisodeGridProps {
  tmdbId: number;
  seasons: Season[];
  watchedEpisodes: Array<{ season: number; episode: number }>;
  onToggleEpisode: (season: number, episode: number, watched: boolean) => void;
  onPressEpisode?: (season: number, episode: Episode) => void;
  onMarkSeasonAired?: (seasonNumber: number) => void;
  isPending?: boolean;
}

function useSeasonsWithEpisodes(tmdbId: number, seasons: Season[]) {
  const results = useQueries({
    queries: seasons.map((season) => ({
      queryKey: ["shows", "season", tmdbId, season.seasonNumber],
      queryFn: () => getSeasonDetails(tmdbId, season.seasonNumber),
      enabled: tmdbId > 0 && season.seasonNumber > 0,
      staleTime: 10 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    return seasons.map((season, index) => ({
      ...season,
      episodes: results[index]?.data?.episodes ?? season.episodes ?? [],
    }));
  }, [seasons, results]);
}

export function LazyEpisodeGrid({
  tmdbId,
  seasons,
  watchedEpisodes,
  onToggleEpisode,
  onPressEpisode,
  onMarkSeasonAired,
  isPending,
}: LazyEpisodeGridProps) {
  const seasonsWithEpisodes = useSeasonsWithEpisodes(tmdbId, seasons);

  return (
    <EpisodeGrid
      seasons={seasonsWithEpisodes}
      watchedEpisodes={watchedEpisodes}
      onToggleEpisode={onToggleEpisode}
      onPressEpisode={onPressEpisode}
      onMarkSeasonAired={onMarkSeasonAired}
      isPending={isPending}
    />
  );
}
