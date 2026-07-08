import { X, Eye, EyeOff, CheckCircle2, Trash2, Ban } from "lucide-react";
import type { WatchStatus } from "../services/tracking.service";
import { useI18n } from "../i18n/useI18n";

interface TrackingActionModalProps {
  open: boolean;
  onClose: () => void;
  status: WatchStatus | null;
  onStatusChange: (status: WatchStatus) => void;
  onMarkUpTo: (season: number, episode: number) => void;
  onMarkAllAired: (season?: number) => void;
  onUnmarkSeason: (season: number) => void;
  onDelete: () => void;
  onToggleDropped: (dropped: boolean) => void;
  currentSeason: number;
  currentEpisode: number;
  isDropped: boolean;
}

export function TrackingActionModal({
  open,
  onClose,
  status,
  onStatusChange,
  onMarkUpTo,
  onMarkAllAired,
  onUnmarkSeason,
  onDelete,
  onToggleDropped,
  currentSeason,
  currentEpisode,
  isDropped,
}: TrackingActionModalProps) {
  const { t } = useI18n();

  if (!open) return null;

  const statuses: WatchStatus[] = ["watching", "completed", "plan_to_watch", "dropped"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text font-bold text-lg">{t("screens.showDetail.tracking")}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                status === s ? "bg-primary text-background" : "bg-surface-light text-text hover:bg-surface"
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

        <div className="space-y-2 pt-4 border-t border-border">
          <button
            onClick={() => onMarkUpTo(currentSeason, currentEpisode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
          >
            <CheckCircle2 size={18} />
            {t("screens.showDetail.markUpTo")} S{currentSeason}E{currentEpisode}
          </button>
          <button
            onClick={() => onMarkAllAired()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
          >
            <CheckCircle2 size={18} />
            {t("screens.showDetail.markAllAired")}
          </button>
          <button
            onClick={() => onUnmarkSeason(currentSeason)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-surface-light text-text hover:bg-surface transition-colors"
          >
            <EyeOff size={18} />
            {t("screens.showDetail.unmarkSeason")} {currentSeason}
          </button>
          {isDropped ? (
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
          )}
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
          >
            <Trash2 size={18} />
            {t("screens.showDetail.removeTracking")}
          </button>
        </div>
      </div>
    </div>
  );
}
