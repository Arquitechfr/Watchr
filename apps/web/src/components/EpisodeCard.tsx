import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPosterUrl } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface EpisodeCardProps {
  posterPath?: string;
  title: string;
  season: number;
  episode: number;
  episodeName?: string;
  isNew?: boolean;
  network?: string;
  airDate?: string;
  onPress?: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
  width?: number;
}

export function EpisodeCard({
  posterPath,
  title,
  season,
  episode,
  episodeName,
  isNew,
  network,
  airDate,
  onPress,
  onMarkWatched,
  isMarking,
  width,
}: EpisodeCardProps) {
  const { t, dateFnsLocale } = useI18n();
  const navigate = useNavigate();
  const posterUrl = posterPath ? getPosterUrl(posterPath, 200) : null;

  function handleClick() {
    if (onPress) onPress();
  }

  return (
    <div
      className="bg-surface rounded-lg overflow-hidden cursor-pointer hover:bg-surface-light transition-colors"
      onClick={handleClick}
      style={{ width: width ?? 128 }}
    >
      <div className="relative aspect-[2/3]">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-light flex items-center justify-center">
            <span className="text-text-muted text-xs text-center px-2">{title}</span>
          </div>
        )}
        {isNew && (
          <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
            {t("common.new")}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-text font-medium text-xs truncate">{title}</p>
        <p className="text-text-muted text-xs">S{season}E{episode}</p>
        {episodeName && (
          <p className="text-text-muted text-xs truncate">{episodeName}</p>
        )}
        {airDate && (
          <p className="text-text-muted text-xs">
            {new Date(airDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        )}
        {onMarkWatched && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkWatched();
            }}
            disabled={isMarking}
            className={`mt-2 w-full p-2 rounded-lg transition-colors ${
              isMarking
                ? "bg-surface-light text-text-muted"
                : "bg-primary text-background hover:bg-primary-dark"
            }`}
          >
            {isMarking ? (
              <Check size={16} className="mx-auto animate-spin" />
            ) : (
              <Check size={16} className="mx-auto" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
