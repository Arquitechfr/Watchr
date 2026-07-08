import { WifiOff, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n/useI18n";

interface NetworkErrorProps {
  onRetry?: () => void;
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <WifiOff size={48} className="text-text-muted mb-4" />
      <p className="text-text font-semibold text-lg mb-1">{t("errors.networkError")}</p>
      <p className="text-text-muted text-sm mb-4">{t("errors.tryAgain")}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <RefreshCw size={16} />
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
