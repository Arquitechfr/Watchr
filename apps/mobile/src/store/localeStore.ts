import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SupportedLocale,
  normalizeLocale,
  getDefaultLocale,
} from "../i18n/translations";

interface LocaleState {
  locale: SupportedLocale;
  isHydrated: boolean;
  setLocale: (locale: SupportedLocale) => void;
  hydrate: () => Promise<void>;
}

function getDeviceLocale(): string {
  if (Platform.OS === 'web') {
    return navigator.language || 'en';
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Localization = require('expo-localization');
  return Localization.getLocales()[0]?.languageTag ?? 'en';
}

const DEVICE_LOCALE = normalizeLocale(getDeviceLocale());

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEVICE_LOCALE,
      isHydrated: false,
      setLocale: (locale) => set({ locale }),
      hydrate: async () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: "watchr-locale",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const stored = state.locale;
        const locale = stored ? normalizeLocale(stored) : DEVICE_LOCALE;
        state.locale = locale;
        state.isHydrated = true;
      },
    },
  ),
);

export function getResolvedLocale(
  storedLocale?: SupportedLocale | null,
): SupportedLocale {
  if (storedLocale && storedLocale !== getDefaultLocale()) {
    return storedLocale;
  }
  return DEVICE_LOCALE;
}
