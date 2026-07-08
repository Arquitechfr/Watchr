import { useThemeContext } from "../theme/ThemeProvider";
import type { ThemePreference } from "../store/themeStore";
import { useI18n } from "../i18n/useI18n";

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "screens.profile.themeSystem",
  light: "screens.profile.themeLight",
  dark: "screens.profile.themeDark",
};

export function ThemeToggle() {
  const { preference, setPreference } = useThemeContext();
  const { t } = useI18n();

  const options: ThemePreference[] = ["system", "light", "dark"];

  return (
    <select
      value={preference}
      onChange={(e) => setPreference(e.target.value as ThemePreference)}
      className="bg-surface text-text px-3 py-1.5 rounded-lg text-sm font-medium border border-border outline-none focus:border-primary transition-colors cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {t(THEME_LABELS[opt])}
        </option>
      ))}
    </select>
  );
}
