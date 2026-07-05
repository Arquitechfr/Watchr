import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LIBRARY_VIEW_MODE_KEY = "watchr-library-view-mode";

type LibraryViewMode = "grid" | "list";

interface SnackbarMessage {
  message: string;
  type: "info" | "success" | "error";
}

interface UIState {
  snackbar: SnackbarMessage | null;
  showSnackbar: (message: string, type?: SnackbarMessage["type"]) => void;
  hideSnackbar: () => void;
  libraryViewMode: LibraryViewMode;
  setLibraryViewMode: (mode: LibraryViewMode) => void;
  hydrateLibraryViewMode: () => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  snackbar: null,
  showSnackbar: (message, type = "info") => {
    set({ snackbar: { message, type } });
  },
  hideSnackbar: () => {
    set({ snackbar: null });
  },
  libraryViewMode: "list",
  setLibraryViewMode: (mode) => {
    set({ libraryViewMode: mode });
    AsyncStorage.setItem(LIBRARY_VIEW_MODE_KEY, mode).catch(() => {});
  },
  hydrateLibraryViewMode: async () => {
    try {
      const stored = await AsyncStorage.getItem(LIBRARY_VIEW_MODE_KEY);
      if (stored === "grid" || stored === "list") {
        if (stored !== get().libraryViewMode) {
          set({ libraryViewMode: stored });
        }
      }
    } catch {
      // Ignore storage errors, keep default
    }
  },
}));
