import { create } from "zustand";

interface SnackbarMessage {
  message: string;
  type: "info" | "success" | "error";
}

interface UIState {
  snackbar: SnackbarMessage | null;
  showSnackbar: (message: string, type?: SnackbarMessage["type"]) => void;
  hideSnackbar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  snackbar: null,
  showSnackbar: (message, type = "info") => {
    set({ snackbar: { message, type } });
  },
  hideSnackbar: () => {
    set({ snackbar: null });
  },
}));
