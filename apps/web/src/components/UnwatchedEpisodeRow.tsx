import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { getPosterUrl } from "../services/shows.service";
import type { UnwatchedShow, UnwatchedEpisode } from "../services/unwatched.service";
import { useI18n } from "../i18n/useI18n";

interface UnwatchedEpisodeRowProps {
  show: UnwatchedShow;
  onMarkWatched: (showId: string, episode: UnwatchedEpisode) => void;
}

export function UnwatchedEpisodeRow({ show, onMarkWatched }: UnwatchedEpisodeRowProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const posterUrl = getPosterUrl(show.posterPath, 92);
  const nextEp = show.unwatchedEpisodes[0];

  if (!nextEp) return null;

  return (
    <div className="flex items-center gap-3 bg-surface rounded-lg p-3 hover:bg-surface-light transition-colors">
      <img
        src={posterUrl}
        alt={show.title}
        className="w-10 h-15 rounded-md object-cover shrink-0 cursor-pointer"
        loading="lazy"
        onClick={() => navigate(`/show/${show.tmdbId}`)}
      />
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/show/${show.tmdbId}`)}
      >
        <p className="text-text font-medium text-sm truncate">{show.title}</p>
        <p className="text-text-muted text-xs">
          S{nextEp.season}E{nextEp.episode}
          {nextEp.name && ` - ${nextEp.name}`}
        </p>
      </div>
      <button
        onClick={() => onMarkWatched(show.showId, nextEp)}
        className="p-2 rounded-full bg-primary text-background hover:bg-primary-dark transition-colors shrink-0"
        aria-label={t("common.markWatched")}
      >
        <Check size={18} />
      </button>
    </div>
  );
}
