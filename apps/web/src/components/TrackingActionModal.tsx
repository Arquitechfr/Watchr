import { useState, useMemo } from "react";
import { X, Eye, EyeOff, CheckCircle2, Trash2, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import type { WatchStatus } from "../services/tracking.service";
import type { ShowDetails } from "../services/shows.service";
import type { WatchEntry } from "../services/tracking.service";
import { RatingStars } from "./RatingStars";
import { useI18n } from "../i18n/useI18n";

interface TrackingActionModalProps {
  open: boolean;
  onClose: () => void;
  show: ShowDetails;
  trackingEntry?: WatchEntry | null;
  rating?: number | null;
  onSave: (payload: {
    currentSeason?: number;
    currentEpisode?: number;
    includePrevious: boolean;
    rating?: number | null;
  }) => void;
  onStatusChange?: (status: WatchStatus) => void;
  onMarkUpTo?: (season: number, episode: number) => void;
  onMarkAllAired?: (season?: number) => void;
  onUnmarkSeason?: (season: number) => void;
  onDelete?: () => void;
  onToggleDropped?: (dropped: boolean) => void;
  isPending?: boolean;
}

export function TrackingActionModal({
  open,
  onClose,
  show,
  trackingEntry,
  rating,
  onSave,
  onStatusChange,
  onMarkUpTo,
  onMarkAllAired,
  onUnmarkSeason,
  onDelete,
  onToggleDropped,
  isPending = false,
}: TrackingActionModalProps) {
  const { t } = useI18n();
  const isTv = show.type === "tv";
  const initialSeason = trackingEntry?.currentSeason ?? (show.seasons[0]?.seasonNumber ?? 1);
  const initialEpisode = trackingEntry?.currentEpisode ?? 1;

  const [selectedSeason, setSelectedSeason] = useState<number>(initialSeason);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(initialEpisode);
  const [includePrevious, setIncludePrevious] = useState(true);
  const [selectedRating, setSelectedRating] = useState<number | null>(rating ?? null);

  const currentSeason = useMemo(
    () => show.seasons.find((s) => s.seasonNumber === selectedSeason) ?? show.seasons[0],
    [show.seasons, selectedSeason],
  );

  const maxEpisode = currentSeason?.episodeCount ?? 1;

  const selectedEpisodeData = useMemo(
    () => currentSeason?.episodes?.find((e) => e.episodeNumber === selectedEpisode),
    [currentSeason, selectedEpisode],
  );

  const handleSave = () => {
    const payload: Parameters<typeof onSave>[0] = {
      includePrevious,
      rating: selectedRating,
    };
    if (isTv) {
      payload.currentSeason = selectedSeason;
      payload.currentEpisode = selectedEpisode;
    }
    onSave(payload);
  };

  const handleSeasonChange = (nextSeasonNumber: number) => {
    setSelectedSeason(nextSeasonNumber);
    const nextSeason = show.seasons.find((s) => s.seasonNumber === nextSeasonNumber);
    const nextMaxEpisode = nextSeason?.episodeCount ?? 1;
    if (selectedEpisode > nextMaxEpisode) {
      setSelectedEpisode(nextMaxEpisode);
    } else if (selectedEpisode < 1) {
      setSelectedEpisode(1);
    }
  };

  const handleEpisodeChange = (delta: number) => {
    const next = selectedEpisode + delta;
    if (next < 1 || next > maxEpisode) return;
    setSelectedEpisode(next);
  };

  if (!open) return null;

  const statuses: WatchStatus[] = ["watching", "completed", "plan_to_watch", "dropped"];
  const isDropped = trackingEntry?.status === "dropped";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text font-bold text-lg">
            {trackingEntry ? t("common.edit") : t("screens.showDetail.addToList")}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={22} />
          </button>
        </div>

        {isTv && (
          <>
            <h3 className="text-lg font-semibold text-text mb-3">
              {t("screens.showDetail.inProgress")}
            </h3>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <span className="text-text-muted text-sm mb-2 block">{t("screens.showDetail.season")}</span>
                <div className="flex items-center bg-surface-light rounded-lg px-3 py-2">
                  <button
                    className="p-2"
                    onClick={() => {
                      const previous = show.seasons
                        .map((s) => s.seasonNumber)
                        .filter((n) => n < selectedSeason)
                        .pop();
                      if (previous !== undefined) handleSeasonChange(previous);
                    }}
                    disabled={isPending}
                  >
                    <ChevronLeft size={20} className="text-text" />
                  </button>
                  <span className="flex-1 text-center text-text font-semibold">
                    {t("screens.showDetail.season")} {selectedSeason}
                  </span>
                  <button
                    className="p-2"
                    onClick={() => {
                      const next = show.seasons
                        .map((s) => s.seasonNumber)
                        .find((n) => n > selectedSeason);
                      if (next !== undefined) handleSeasonChange(next);
                    }}
                    disabled={isPending}
                  >
                    <ChevronRight size={20} className="text-text" />
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <span className="text-text-muted text-sm mb-2 block">{t("screens.showDetail.episode")}</span>
                <div className="flex items-center bg-surface-light rounded-lg px-3 py-2">
                  <button
                    className="p-2"
                    onClick={() => handleEpisodeChange(-1)}
                    disabled={isPending || selectedEpisode <= 1}
                  >
                    <ChevronLeft size={20} className="text-text" />
                  </button>
                  <span className="flex-1 text-center text-text font-semibold">
                    {t("screens.showDetail.episode")} {selectedEpisode}
                    {selectedEpisodeData?.name ? ` · ${selectedEpisodeData.name}` : ""}
                  </span>
                  <button
                    className="p-2"
                    onClick={() => handleEpisodeChange(1)}
                    disabled={isPending || selectedEpisode >= maxEpisode}
                  >
                    <ChevronRight size={20} className="text-text" />
                  </button>
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-3 mb-6 cursor-pointer">
              <span className="text-text flex-1">
                {t("screens.episode.markPreviousMessage")}
              </span>
              <input
                type="checkbox"
                checked={includePrevious}
                onChange={(e) => setIncludePrevious(e.target.checked)}
                disabled={isPending}
                className="ml-3 w-5 h-5 accent-primary"
              />
            </label>
          </>
        )}

        <h3 className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.yourRating")}</h3>
        <div className="mb-6">
          <RatingStars value={selectedRating} onChange={setSelectedRating} />
        </div>

        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-text-muted px-4 py-2"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className={`font-semibold px-4 py-2 ${isPending ? "text-text-muted" : "text-primary"}`}
          >
            {t("common.save")}
          </button>
        </div>

        {trackingEntry && onStatusChange && (
          <div className="space-y-2 pt-4 border-t border-border">
            <h3 className="text-text font-semibold text-sm mb-2">{t("screens.showDetail.tracking")}</h3>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  trackingEntry.status === s ? "bg-primary text-background" : "bg-surface-light text-text hover:bg-surface"
                }`}
              >
                {s === "watching" && <Eye size={18} />}
                {s === "completed" && <CheckCircle2 size={18} />}
                {s === "plan_to_watch" && <EyeOff size={18} />}
                {s === "dropped" && <Ban size={18} />}
                {t(`common.status.${s}`)}
              </button>
            ))}
          </div>
        )}

        {trackingEntry && (
          <div className="space-y-2 pt-4 border-t border-border">
            {onMarkUpTo && (
              <button
                onClick={() => onMarkUpTo(selectedSeason, selectedEpisode)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
              >
                <CheckCircle2 size={18} />
                {t("screens.showDetail.markUpTo")} S{selectedSeason}E{selectedEpisode}
              </button>
            )}
            {onMarkAllAired && (
              <button
                onClick={() => onMarkAllAired()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
              >
                <CheckCircle2 size={18} />
                {t("screens.showDetail.markAllAired")}
              </button>
            )}
            {onUnmarkSeason && (
              <button
                onClick={() => onUnmarkSeason(selectedSeason)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
              >
                <EyeOff size={18} />
                {t("screens.showDetail.unmarkSeason")} {selectedSeason}
              </button>
            )}
            {onToggleDropped && (
              isDropped ? (
                <button
                  onClick={() => onToggleDropped(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
                >
                  <Eye size={18} />
                  {t("screens.showDetail.undrop")}
                </button>
              ) : (
                <button
                  onClick={() => onToggleDropped(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
                >
                  <Ban size={18} />
                  {t("screens.showDetail.drop")}
                </button>
              )
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
              >
                <Trash2 size={18} />
                {t("screens.showDetail.removeTracking")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
