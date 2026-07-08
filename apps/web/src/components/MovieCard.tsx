import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPosterUrl } from "../services/shows.service";
import type { UnwatchedMovie } from "../services/unwatched.service";
import { useI18n } from "../i18n/useI18n";
import { WatchStatus } from "../services/tracking.service";

interface MovieCardProps {
  movie: UnwatchedMovie;
  onPress: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

function getStatusLabel(t: ReturnType<typeof useI18n>["t"], status: WatchStatus): string {
  switch (status) {
    case "watching":
      return t("screens.showDetail.inProgress");
    case "completed":
      return t("screens.showDetail.completed");
    case "plan_to_watch":
      return t("screens.showDetail.planToWatch");
    case "dropped":
      return t("screens.showDetail.dropped");
  }
}

const statusColorMap: Record<WatchStatus, string> = {
  watching: "text-primary",
  completed: "text-success",
  plan_to_watch: "text-text-muted",
  dropped: "text-error",
};

export function MovieCard({ movie, onPress, onMarkWatched, isMarking }: MovieCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const posterUrl = movie.posterPath ? getPosterUrl(movie.posterPath, 92) : null;

  const genreNames = (movie.genres ?? []).filter((g) => g.name).slice(0, 2).map((g) => g.name!);

  return (
    <div
      className="flex items-center gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
      onClick={onPress}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-16 h-24 rounded-md object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-24 rounded-md bg-surface-light flex items-center justify-center shrink-0">
          <span className="text-text-muted text-xs text-center px-2">{t("common.noImage")}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text font-semibold text-base truncate">{movie.title}</p>
        {movie.year ? (
          <p className="text-text-muted text-xs mb-1">
            {movie.year} · {t("common.movie")}
          </p>
        ) : (
          <p className="text-text-muted text-xs mb-1">{t("common.movie")}</p>
        )}
        {genreNames.length > 0 && (
          <p className="text-text-muted text-xs mb-1 truncate">
            {genreNames.join(" · ")}
          </p>
        )}
        <p className={`text-xs font-semibold ${statusColorMap[movie.status]}`}>
          {getStatusLabel(t, movie.status)}
        </p>
      </div>
      {onMarkWatched && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkWatched();
          }}
          className="ml-2 p-1 text-primary hover:text-primary-dark transition-colors shrink-0"
          disabled={isMarking}
        >
          {isMarking ? (
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle size={28} />
          )}
        </button>
      )}
    </div>
  );
}
