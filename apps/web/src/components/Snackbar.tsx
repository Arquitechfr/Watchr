import { useEffect } from "react";
import { useUIStore } from "../store/uiStore";

export function Snackbar() {
  const snackbar = useUIStore((s) => s.snackbar);
  const hideSnackbar = useUIStore((s) => s.hideSnackbar);

  useEffect(() => {
    if (snackbar) {
      const timer = setTimeout(() => hideSnackbar(), 4000);
      return () => clearTimeout(timer);
    }
  }, [snackbar, hideSnackbar]);

  if (!snackbar) return null;

  const bgColor =
    snackbar.type === "error"
      ? "bg-danger"
      : snackbar.type === "success"
        ? "bg-success"
        : "bg-surface-light";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div
        className={`${bgColor} text-text px-5 py-3 rounded-lg shadow-lg max-w-sm text-center text-sm font-medium`}
      >
        {snackbar.message}
      </div>
    </div>
  );
}
