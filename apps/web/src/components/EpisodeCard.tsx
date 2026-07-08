import { Check } from "lucide-react";
import { getStillUrl } from "../services/shows.service";
import type { Episode } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface EpisodeCardProps {
  episode: Episode;
  seasonNumber: number;
  isWatched: boolean;
  onToggle: () => void;
}

export function EpisodeCard({ episode, seasonNumber, isWatched, onToggle }: EpisodeCardProps) {
  const { t } = useI18n();
  const stillUrl = getStillUrl(episode.stillPath, 300);

  return (
    <div className="flex gap-3 bg-surface rounded-lg p-3 hover:bg-surface-light transition-colors">
      <div className="relative shrink-0">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={episode.name ?? `S${seasonNumber}E${episode.episodeNumber}`}
            className="w-32 h-18 rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-32 h-18 bg-surface-light rounded-md" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text font-medium text-sm">
          S{seasonNumber}E{episode.episodeNumber}
          {episode.name && ` - ${episode.name}`}
        </p>
        {episode.airDate && (
          <p className="text-text-muted text-xs mt-0.5">
            {new Date(episode.airDate).toLocaleDateString()}
          </p>
        )}
        {episode.overview && (
          <p className="text-text-muted text-xs mt-1 line-clamp-2">{episode.overview}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`self-center p-2 rounded-full transition-colors shrink-0 ${
          isWatched
            ? "bg-success/20 text-success"
            : "bg-surface-light text-text-muted hover:text-text"
        }`}
        aria-label={isWatched ? t("common.markUnwatched") : t("common.markWatched")}
      >
        <Check size={18} />
      </button>
    </div>
  );
}
