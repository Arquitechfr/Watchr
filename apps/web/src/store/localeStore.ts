import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SUPPORTED_LOCALES, normalizeLocale, type SupportedLocale } from "../i18n/translations";

function detectDeviceLocale(): SupportedLocale {
  if (typeof navigator !== "undefined" && navigator.language) {
    return normalizeLocale(navigator.language);
  }
  return "en";
}

interface LocaleState {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: detectDeviceLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "watchr-locale",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
