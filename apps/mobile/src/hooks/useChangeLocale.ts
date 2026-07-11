import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocaleStore } from "../store/localeStore";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import { updateLanguage } from "../services/auth.service";
import type { SupportedLocale } from "../i18n/translations";

export function useChangeLocale() {
  const setLocale = useLocaleStore((state) => state.setLocale);
  const queryClient = useQueryClient();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();

  return useCallback(
    async (lang: SupportedLocale) => {
      setLocale(lang);
      if (!useAuthStore.getState().isAuthenticated) {
        await queryClient.invalidateQueries();
        return;
      }
      try {
        await updateLanguage(lang);
      } catch {
        showSnackbar(t("screens.profile.languageSyncError"), "error");
      }
      await queryClient.invalidateQueries();
    },
    [setLocale, queryClient, showSnackbar, t],
  );
}
