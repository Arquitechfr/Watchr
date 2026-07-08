import { useNavigate } from "react-router-dom";
import { Calendar, Check } from "lucide-react";
import { getPosterUrl } from "../services/shows.service";
import type { UpcomingEpisode } from "../services/upcoming.service";
import { useI18n } from "../i18n/useI18n";
import { format } from "date-fns";

interface UpcomingEpisodeRowProps {
  episode: UpcomingEpisode;
  onPress?: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

export function UpcomingEpisodeRow({ episode, onPress, onMarkWatched, isMarking }: UpcomingEpisodeRowProps) {
  const navigate = useNavigate();
  const { dateFnsLocale } = useI18n();
  const posterUrl = getPosterUrl(episode.posterPath, 92);

  return (
    <div
      className="flex items-center gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
      onClick={onPress}
    >
      <img
        src={posterUrl}
        alt={episode.title}
        className="w-10 h-15 rounded-md object-cover shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-text font-medium text-sm truncate">{episode.title}</p>
        <p className="text-text-muted text-xs">
          S{episode.season}E{episode.episode}
          {episode.name && ` - ${episode.name}`}
        </p>
      </div>
      <div className="flex items-center gap-1 text-text-muted text-xs shrink-0">
        <Calendar size={14} />
        {format(new Date(episode.airDate), "MMM d", { locale: dateFnsLocale })}
      </div>
      {onMarkWatched && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkWatched();
          }}
          disabled={isMarking}
          className={`self-center p-2 rounded-full transition-colors shrink-0 ${
            isMarking
              ? "bg-surface-light text-text-muted"
              : "bg-primary text-background hover:bg-primary-dark"
          }`}
        >
          {isMarking ? <Check size={16} className="animate-spin" /> : <Check size={16} />}
        </button>
      )}
    </div>
  );
}
