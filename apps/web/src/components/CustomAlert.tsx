import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "../i18n/useI18n";

interface CustomAlertProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

export function CustomAlert({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "default",
}: CustomAlertProps) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-surface rounded-xl p-5 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          {variant === "danger" && (
            <AlertTriangle size={24} className="text-danger shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className="text-text font-bold text-lg">{title}</h3>
            <p className="text-text-muted text-sm mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-light transition-colors"
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              variant === "danger"
                ? "bg-danger text-white hover:bg-danger/80"
                : "bg-primary text-background hover:bg-primary-dark"
            }`}
          >
            {confirmLabel ?? t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
