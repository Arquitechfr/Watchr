import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themePreference: "system",
      setThemePreference: (pref) => set({ themePreference: pref }),
    }),
    {
      name: "watchr-theme",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
