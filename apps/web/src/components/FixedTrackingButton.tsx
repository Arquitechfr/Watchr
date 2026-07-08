import { Plus, Play, Trash2, CheckCircle, XCircle } from "lucide-react";
import type { ShowDetails } from "../services/shows.service";
import type { WatchEntry } from "../services/tracking.service";
import { useI18n } from "../i18n/useI18n";

interface FixedTrackingButtonProps {
  show: ShowDetails;
  trackingEntry?: WatchEntry | null;
  progress?: number;
  onPress: () => void;
  disabled?: boolean;
  onToggleWatched?: () => void;
  onToggleDropped?: () => void;
}

export function FixedTrackingButton({
  show,
  trackingEntry,
  progress,
  onPress,
  disabled,
  onToggleWatched,
  onToggleDropped,
}: FixedTrackingButtonProps) {
  const { t } = useI18n();
  const hasProgress = progress !== undefined && progress > 0 && progress < 1;
  const isCompleted = progress === 1;

  if (show.type === "movie" && trackingEntry && onToggleWatched) {
    const isWatched = trackingEntry.status === "completed";
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 pt-3 pb-4 z-40">
        <button
          onClick={onToggleWatched}
          disabled={disabled}
          className="flex items-center justify-center w-full py-3 rounded-lg bg-primary text-white"
        >
          {isWatched ? (
            <XCircle size={20} className="mr-2" />
          ) : (
            <CheckCircle size={20} className="mr-2" />
          )}
          <span className="font-semibold text-white">
            {isWatched ? t("screens.showDetail.markUnwatched") : t("screens.showDetail.markWatched")}
          </span>
        </button>
      </div>
    );
  }

  const isTvTracked = show.type === "tv" && trackingEntry && onToggleDropped;
  const isDropped = trackingEntry?.status === "dropped";

  let label = t("screens.showDetail.addToList");
  if (isTvTracked) {
    label = isDropped
      ? t("screens.showDetail.resumeShow")
      : t("screens.showDetail.dropShow");
  } else if (trackingEntry) {
    if (isCompleted) {
      label = t("screens.showDetail.completed");
    } else {
      label = t("screens.showDetail.inProgress");
    }
  }

  const buttonClassName = isTvTracked && !isDropped ? "bg-danger" : "bg-primary";

  const iconName = isTvTracked
    ? isDropped
      ? "play"
      : "trash"
    : trackingEntry
      ? "play"
      : "plus";

  const handlePress = isTvTracked ? onToggleDropped! : onPress;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 pt-3 pb-4 z-40">
      <button
        onClick={handlePress}
        disabled={disabled}
        className={`flex items-center justify-center w-full py-3 rounded-lg ${buttonClassName} text-white`}
      >
        {iconName === "plus" && <Plus size={20} className="mr-2" />}
        {iconName === "play" && <Play size={20} className="mr-2" />}
        {iconName === "trash" && <Trash2 size={20} className="mr-2" />}
        <span className="font-semibold text-white">{label}</span>
      </button>
      {hasProgress && (
        <div className="mt-2 h-1 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
