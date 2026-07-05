import { useThemeContext } from "../theme/ThemeProvider";
import type { ThemePreference } from "../store/themeStore";

export function ThemeToggle() {
  const { preference, setPreference } = useThemeContext();

  const options: ThemePreference[] = ["system", "light", "dark"];

  return (
    <div className="flex gap-1 bg-surface rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => setPreference(opt)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            preference === opt
              ? "bg-primary text-background"
              : "text-text-muted hover:text-text"
          }`}
        >
          {opt === "system" ? "Auto" : opt === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}
