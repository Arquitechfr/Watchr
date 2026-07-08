import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { getPosterUrl } from "../services/shows.service";
import type { SearchResultItem } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface ShowCardProps {
  item: SearchResultItem;
  isTracked?: boolean;
  onQuickAdd?: () => void;
}

export function ShowCard({ item, isTracked, onQuickAdd }: ShowCardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const posterUrl = getPosterUrl(item.posterPath, 200);

  return (
    <div
      className="flex gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
      onClick={() => navigate(`/show/${item.tmdbId}`)}
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt={item.title}
          className="w-12 h-18 rounded-md object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text font-medium text-sm truncate">{item.title}</p>
        <p className="text-text-muted text-xs mt-0.5">
          {item.type === "tv" ? t("common.series") : t("common.movie")}
          {item.firstAirDate && ` • ${new Date(item.firstAirDate).getFullYear()}`}
        </p>
        {item.overview && (
          <p className="text-text-muted text-xs mt-1 line-clamp-2">{item.overview}</p>
        )}
      </div>
      {onQuickAdd && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          disabled={isTracked}
          className={`self-center p-2 rounded-full transition-colors shrink-0 ${
            isTracked
              ? "bg-success/20 text-success"
              : "bg-primary text-background hover:bg-primary-dark"
          }`}
        >
          {isTracked ? <Check size={18} /> : <Plus size={18} />}
        </button>
      )}
    </div>
  );
}
