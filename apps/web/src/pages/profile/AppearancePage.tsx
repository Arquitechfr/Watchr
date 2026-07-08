import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { useThemeStore } from "../../store/themeStore";
import { updateThemePreference } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useI18n } from "../../i18n/useI18n";
import { Check, Sun, Moon, Monitor } from "lucide-react";

export function AppearancePage() {
  const { t } = useI18n();
  const { themePreference, setThemePreference } = useThemeStore();
  const { showSnackbar } = useUIStore();

  const options = [
    { key: "light", label: t("screens.profile.themeLight"), icon: Sun },
    { key: "dark", label: t("screens.profile.themeDark"), icon: Moon },
    { key: "system", label: t("screens.profile.themeSystem"), icon: Monitor },
  ] as const;

  async function handleSelect(key: string) {
    setThemePreference(key as "light" | "dark" | "system");
    try {
      await updateThemePreference(key as "light" | "dark" | "system");
    } catch {
      // non-critical
    }
    showSnackbar(t("screens.profile.themeUpdated"), "success");
  }

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.appearance")} />

      <div className="space-y-1">
        {options.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface rounded-lg hover:bg-surface-light transition-colors"
          >
            <Icon size={20} className="text-text-muted" />
            <span className="text-text text-sm font-medium flex-1 text-left">{label}</span>
            {themePreference === key && <Check size={20} className="text-primary" />}
          </button>
        ))}
      </div>
    </PageWrapper>
  );
}
