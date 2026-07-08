import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { useThemeStore, type ThemePreference } from "../../store/themeStore";
import { updateThemePreference, type Me } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useI18n } from "../../i18n/useI18n";
import { Check, Sun, Moon, Monitor } from "lucide-react";

const OPTIONS: { value: ThemePreference; labelKey: string; icon: typeof Sun }[] = [
  { value: "system", labelKey: "screens.profile.appearanceSystem", icon: Monitor },
  { value: "light", labelKey: "screens.profile.appearanceLight", icon: Sun },
  { value: "dark", labelKey: "screens.profile.appearanceDark", icon: Moon },
];

export function AppearancePage() {
  const { t } = useI18n();
  const preference = useThemeStore((s) => s.themePreference);
  const setPreference = useThemeStore((s) => s.setThemePreference);
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<ThemePreference | null>(null);

  async function handleChange(pref: ThemePreference) {
    if (pref === preference) return;
    setLoading(pref);
    try {
      await updateThemePreference(pref);
      setPreference(pref);
      queryClient.setQueryData<Me>(["me"], (old: Me | undefined) => (old ? { ...old, themePreference: pref } : old));
    } catch (error) {
      showSnackbar(getErrorMessage(error), "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.appearance")} />

      <p className="text-text-muted text-center mb-6">{t("screens.profile.appearance")}</p>
      <div className="space-y-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={loading !== null}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface rounded-lg hover:bg-surface-light transition-colors"
          >
            <opt.icon size={20} className="text-text-muted" />
            <span className="text-text text-sm font-medium flex-1 text-left">{t(opt.labelKey)}</span>
            {loading === opt.value ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : preference === opt.value ? (
              <Check size={20} className="text-primary" />
            ) : null}
          </button>
        ))}
      </div>
    </PageWrapper>
  );
}
