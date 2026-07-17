import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useToastStore, type Toast } from "../../store/toastStore";
import { cn } from "../../lib/utils";

const TOAST_STYLES: Record<Toast["type"], { className: string; icon: typeof CheckCircle }> = {
  success: { className: "border-success/40 bg-success/10 text-success", icon: CheckCircle },
  error: { className: "border-danger/40 bg-danger/10 text-danger", icon: XCircle },
  info: { className: "border-primary/40 bg-primary/10 text-primary", icon: Info },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const style = TOAST_STYLES[t.type];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-right",
              style.className,
            )}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="flex-1 text-text">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-text-muted hover:text-text shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
