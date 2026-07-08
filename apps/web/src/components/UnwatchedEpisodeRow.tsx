import { Check } from "lucide-react";
import { getPosterUrl } from "../services/shows.service";
import type { UnwatchedEpisode } from "../services/unwatched.service";
import { useI18n } from "../i18n/useI18n";

interface UnwatchedEpisodeRowProps {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  episode: UnwatchedEpisode;
  isNew?: boolean;
  onPress: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

export function UnwatchedEpisodeRow({
  title,
  posterPath,
  episode,
  isNew,
  onPress,
  onMarkWatched,
  isMarking,
}: UnwatchedEpisodeRowProps) {
  const { t } = useI18n();
  const posterUrl = getPosterUrl(posterPath, 92);

  const seasonEpisodeLabel = `S${String(episode.season).padStart(2, "0")}E${String(episode.episode).padStart(2, "0")}`;

  return (
    <div
      className="flex items-center gap-3 bg-surface rounded-lg p-3 hover:bg-surface-light transition-colors cursor-pointer"
      onClick={onPress}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className="w-10 h-15 rounded-md object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-15 rounded-md bg-surface-light shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text font-medium text-sm truncate">{title}</p>
        <p className="text-text-muted text-xs">
          {seasonEpisodeLabel}
          {episode.name && ` - ${episode.name}`}
        </p>
        {isNew && (
          <span className="inline-block bg-primary text-background text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
            {t("common.newEpisode")}
          </span>
        )}
      </div>
      {onMarkWatched && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkWatched();
          }}
          disabled={isMarking}
          className="p-2 rounded-full bg-primary text-background hover:bg-primary-dark transition-colors shrink-0 disabled:opacity-50"
          aria-label={t("common.markWatched")}
        >
          <Check size={18} />
        </button>
      )}
    </div>
  );
}
