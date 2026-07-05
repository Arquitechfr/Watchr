import type { ImportProgress } from "../services/import.service";
import { useI18n } from "../i18n/useI18n";

interface ImportProgressBarProps {
  progress: ImportProgress;
}

export function ImportProgressBar({ progress }: ImportProgressBarProps) {
  const { t } = useI18n();
  const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="h-3 bg-surface rounded-full overflow-hidden mb-2">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-text-muted text-sm text-center">
        {progress.processed} / {progress.total} ({percentage}%)
        {" · "}
        {progress.matched} {t("screens.import.imported")}, {progress.failed} {t("screens.import.failures")}
      </p>
    </div>
  );
}
