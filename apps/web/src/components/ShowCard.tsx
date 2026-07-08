import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { getPosterUrl } from "../services/shows.service";
import type { SearchResultItem } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface ShowCardProps {
  show: SearchResultItem;
  onPress?: () => void;
  onQuickAdd?: () => void;
  isTracked?: boolean;
  isAdding?: boolean;
}

export function ShowCard({ show, onPress, onQuickAdd, isTracked, isAdding }: ShowCardProps) {
  const { t } = useI18n();
  const posterUrl = getPosterUrl(show.posterPath, 200);

  return (
    <div
      className="flex gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
      onClick={onPress}
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt={show.title}
          className="w-12 h-18 rounded-md object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text font-medium text-sm truncate">{show.title}</p>
        <p className="text-text-muted text-xs mt-0.5">
          {show.type === "tv" ? t("common.series") : t("common.movie")}
          {show.firstAirDate && ` • ${new Date(show.firstAirDate).getFullYear()}`}
        </p>
        {show.overview && (
          <p className="text-text-muted text-xs mt-1 line-clamp-2">{show.overview}</p>
        )}
      </div>
      {onQuickAdd && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          disabled={isTracked || isAdding}
          className={`self-center p-2 rounded-full transition-colors shrink-0 ${
            isTracked
              ? "bg-success/20 text-success"
              : "bg-primary text-background hover:bg-primary-dark"
          }`}
        >
          {isAdding ? <Plus size={18} className="animate-spin" /> : isTracked ? <Check size={18} /> : <Plus size={18} />}
        </button>
      )}
    </div>
  );
}
