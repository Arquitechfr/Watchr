import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, CheckCircle, Circle, Image as ImageIcon, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import type { Season, Episode } from "../services/shows.service";
import { getStillUrl } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface EpisodeGridProps {
  seasons: Season[];
  tmdbId: number;
  watchedEpisodes: Array<{ season: number; episode: number }>;
  onToggleEpisode: (season: number, episode: number, watched: boolean) => void;
  onPressEpisode?: (season: number, episode: Episode) => void;
  onMarkSeasonAired?: (seasonNumber: number) => void;
  isPending?: boolean;
}

export function EpisodeGrid({
  seasons,
  tmdbId,
  watchedEpisodes,
  onToggleEpisode,
  onPressEpisode,
  onMarkSeasonAired,
  isPending,
}: EpisodeGridProps) {
  const { t, dateFnsLocale } = useI18n();
  const navigate = useNavigate();
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<number>>(
    () => new Set(seasons.map((s) => s.seasonNumber)),
  );

  const watchedKeys = new Set(
    watchedEpisodes.map((ep) => `${ep.season}-${ep.episode}`),
  );

  const getEpisodes = (season: Season) => season.episodes ?? [];

  const toggleSeason = (seasonNumber: number) => {
    setCollapsedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  const handleEpisodeClick = (seasonNumber: number, episode: Episode) => {
    if (onPressEpisode) {
      onPressEpisode(seasonNumber, episode);
    } else {
      navigate(`/show/${tmdbId}/episode/${seasonNumber}/${episode.episodeNumber}`);
    }
  };

  const handleEpisodeToggle = (e: React.MouseEvent, seasonNumber: number, episodeNumber: number, isWatched: boolean) => {
    e.stopPropagation();
    onToggleEpisode(seasonNumber, episodeNumber, !isWatched);
  };

  function renderEpisode(seasonNumber: number, episode: Episode) {
    const key = `${seasonNumber}-${episode.episodeNumber}`;
    const isWatched = watchedKeys.has(key);
    const stillUrl = getStillUrl(episode.stillPath, 200);

    return (
      <div
        key={key}
        className={`flex items-center bg-surface rounded-lg p-3 mb-2 cursor-pointer hover:bg-surface-light transition-colors border ${
          isWatched ? "border-primary" : "border-border"
        }`}
        onClick={() => handleEpisodeClick(seasonNumber, episode)}
      >
        {stillUrl ? (
          <img
            src={stillUrl}
            alt=""
            className="w-20 h-12 rounded bg-surface-light mr-3 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-20 h-12 rounded bg-surface-light flex items-center justify-center mr-3">
            <ImageIcon size={16} className="text-text-muted" />
          </div>
        )}
        <button
          onClick={(e) => handleEpisodeToggle(e, seasonNumber, episode.episodeNumber, isWatched)}
          disabled={isPending}
          className="mr-3 shrink-0"
        >
          {isWatched ? (
            <CheckCircle size={20} className="text-primary" />
          ) : (
            <Circle size={20} className="text-text-muted" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-text font-medium text-sm">
            {episode.episodeNumber}. {episode.name ?? `${t("screens.showDetail.episode")} ${episode.episodeNumber}`}
          </p>
          {episode.overview && (
            <p className="text-text-muted text-xs mt-1 line-clamp-2">{episode.overview}</p>
          )}
          {episode.airDate && (
            <p className="text-text-muted text-xs mt-1">
              {format(new Date(episode.airDate), "d MMM yyyy", { locale: dateFnsLocale })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {seasons.map((season) => {
        const isCollapsed = collapsedSeasons.has(season.seasonNumber);
        return (
          <div key={`season-${season.seasonNumber}`} className="mb-4">
            <div
              className="flex items-center justify-between bg-surface rounded-lg px-3 py-3 mb-3 cursor-pointer hover:bg-surface-light transition-colors"
              onClick={() => toggleSeason(season.seasonNumber)}
            >
              <span className="text-lg font-semibold text-primary">
                {t("screens.showDetail.season")} {season.seasonNumber}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-text-muted text-sm">
                  {getEpisodes(season).length} {t("screens.showDetail.episodes").toLowerCase()}
                </span>
                {onMarkSeasonAired && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkSeasonAired(season.seasonNumber);
                    }}
                    disabled={isPending}
                    className="p-1 hover:bg-surface-light rounded transition-colors"
                    title={t("screens.showDetail.markAllAired")}
                  >
                    <CheckCheck size={20} className="text-primary" />
                  </button>
                )}
                {isCollapsed ? (
                  <ChevronDown size={20} className="text-primary" />
                ) : (
                  <ChevronUp size={20} className="text-primary" />
                )}
              </div>
            </div>
            {!isCollapsed && (
              <div>
                {getEpisodes(season).map((episode) =>
                  renderEpisode(season.seasonNumber, episode),
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
