import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeState {
  themePreference: ThemePreference;
  isHydrated: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themePreference: "dark",
      isHydrated: false,
      setThemePreference: (pref) => set({ themePreference: pref }),
      hydrate: async () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: "watchr-theme",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.isHydrated = true;
      },
    },
  ),
);
