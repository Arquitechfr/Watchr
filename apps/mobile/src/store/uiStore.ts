import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LIBRARY_VIEW_MODE_KEY = "watchr-library-view-mode";

type LibraryViewMode = "grid" | "list";

interface SnackbarMessage {
  message: string;
  type: "info" | "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
}

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface UIState {
  snackbar: SnackbarMessage | null;
  showSnackbar: (message: string, type?: SnackbarMessage["type"], action?: { label: string; onPress: () => void }) => void;
  hideSnackbar: () => void;
  alert: AlertConfig | null;
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
  libraryViewMode: LibraryViewMode;
  setLibraryViewMode: (mode: LibraryViewMode) => void;
  hydrateLibraryViewMode: () => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  snackbar: null,
  showSnackbar: (message, type = "info", action) => {
    set({ snackbar: { message, type, actionLabel: action?.label, onAction: action?.onPress } });
  },
  hideSnackbar: () => {
    set({ snackbar: null });
  },
  alert: null,
  showAlert: (config) => {
    set({ alert: config });
  },
  hideAlert: () => {
    set({ alert: null });
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
