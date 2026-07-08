import type { Episode } from "../services/shows.service";
import { EpisodeCard } from "./EpisodeCard";

interface EpisodeGridProps {
  episodes: Episode[];
  seasonNumber: number;
  watchedEpisodes: Set<string>;
  onToggle: (season: number, episode: number) => void;
}

function episodeKey(season: number, episode: number): string {
  return `S${season}E${episode}`;
}

export function EpisodeGrid({ episodes, seasonNumber, watchedEpisodes, onToggle }: EpisodeGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {episodes.map((ep) => (
        <EpisodeCard
          key={ep.episodeNumber}
          episode={ep}
          seasonNumber={seasonNumber}
          isWatched={watchedEpisodes.has(episodeKey(seasonNumber, ep.episodeNumber))}
          onToggle={() => onToggle(seasonNumber, ep.episodeNumber)}
        />
      ))}
    </div>
  );
}
