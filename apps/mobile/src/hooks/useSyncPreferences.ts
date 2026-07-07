import { useThemeStore } from "../store/themeStore";
import { useLocaleStore } from "../store/localeStore";
import { updateThemePreference, updateLanguage } from "../services/auth.service";
import { log } from "../utils/logger";

export function syncPreferencesToBackend(): void {
  const themePref = useThemeStore.getState().themePreference;
  const locale = useLocaleStore.getState().locale;

  log("SyncPreferences", "syncing", { themePref, locale });

  Promise.allSettled([
    updateThemePreference(themePref),
    updateLanguage(locale),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        log("SyncPreferences", `sync ${i === 0 ? "theme" : "language"} failed`, r.reason);
      }
    });
  });
}
