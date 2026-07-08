import { useNavigate } from "react-router-dom";
import { getPosterUrl } from "../services/shows.service";
import { ProgressBar } from "./ProgressBar";
import type { LibraryItem } from "../services/library.service";
import type { SearchResultItem } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface PosterCardProps {
  item?: LibraryItem;
  show?: SearchResultItem;
  onPress?: () => void;
  watched?: number;
  total?: number;
  width?: number;
  genres?: string[];
  statusLabel?: string;
  statusColor?: string;
}

export function PosterCard({ item, show, onPress, watched, total, width, genres, statusLabel, statusColor }: PosterCardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const showData = item?.show ?? show;
  const status = item?.status;
  const watchedCount = item?.watchedEpisodes.length ?? watched ?? 0;
  const totalCount = item?.show.totalEpisodes ?? total ?? 0;
  
  if (!showData) return null;

  const posterUrl = getPosterUrl(showData.posterPath ?? undefined, 200);
  const year = show ? (show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : null) : null;

  const statusColors: Record<string, string> = {
    watching: "bg-primary",
    completed: "bg-success",
    plan_to_watch: "bg-blue-500",
    dropped: "bg-danger",
  };

  const cardStyle = width ? { width: `${width}px` } : {};
  const cardHeight = width ? `${Math.round(width * 1.5)}px` : "100%";

  const handleClick = () => {
    if (onPress) {
      onPress();
    } else if (showData.tmdbId) {
      navigate(`/show/${showData.tmdbId}`);
    }
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
      onClick={handleClick}
      style={cardStyle}
    >
      <div style={{ aspectRatio: "2/3", height: cardHeight }}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={showData.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-light flex items-center justify-center">
            <span className="text-text-muted text-xs text-center px-2">{showData.title}</span>
          </div>
        )}
      </div>
      {status && (
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium text-white ${statusColors[status] ?? "bg-gray-500"}`}>
          {statusLabel ?? status.replace(/_/g, " ")}
        </div>
      )}
      {showData.type === "tv" && totalCount > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <ProgressBar watched={watchedCount} total={totalCount} />
          <p className="text-white text-xs mt-1">
            {watchedCount}/{totalCount}
          </p>
        </div>
      )}
      <div className="mt-2 px-1">
        <p className="text-text text-sm font-medium line-clamp-2">
          {showData.title}
        </p>
        <p className="text-text-muted text-xs mt-0.5">
          {year ? year : "—"}
          {" · "}
          {showData.type === "tv" ? t("common.tv") : t("common.movie")}
        </p>
        {genres && genres.length > 0 && (
          <p className="text-text-muted text-xs mt-0.5 line-clamp-1">
            {genres.join(" · ")}
          </p>
        )}
        {statusLabel && statusColor && (
          <p className={`text-xs font-semibold mt-1 ${statusColor}`}>
            {statusLabel}
          </p>
        )}
      </div>
    </div>
  );
}
