import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SnackbarMessage {
  message: string;
  type: "info" | "success" | "error";
}

interface AlertState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

interface UIState {
  snackbar: SnackbarMessage | null;
  showSnackbar: (message: string, type?: SnackbarMessage["type"]) => void;
  hideSnackbar: () => void;
  alert: AlertState | null;
  showAlert: (alert: Omit<AlertState, "open">) => void;
  hideAlert: () => void;
  libraryViewMode: "list" | "grid";
  setLibraryViewMode: (mode: "list" | "grid") => void;
  hydrateLibraryViewMode: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      snackbar: null,
      showSnackbar: (message, type = "info") => {
        set({ snackbar: { message, type } });
      },
      hideSnackbar: () => {
        set({ snackbar: null });
      },
      alert: null,
      showAlert: (alert) => {
        set({ alert: { ...alert, open: true } });
      },
      hideAlert: () => {
        set({ alert: null });
      },
      libraryViewMode: "list",
      setLibraryViewMode: (mode) => {
        set({ libraryViewMode: mode });
      },
      hydrateLibraryViewMode: () => {
        // Already handled by persist middleware
      },
    }),
    {
      name: "watchr-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        libraryViewMode: state.libraryViewMode,
      }),
    },
  ),
);
