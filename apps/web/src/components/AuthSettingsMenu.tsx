import { useState, useRef, useEffect } from "react";
import { Settings, Globe, Moon } from "lucide-react";
import { useLocaleStore } from "../store/localeStore";
import { useThemeContext } from "../theme/ThemeProvider";
import { SUPPORTED_LOCALES } from "../i18n/translations";
import type { ThemePreference } from "../store/themeStore";
import { useI18n } from "../i18n/useI18n";

export function AuthSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { preference, setPreference } = useThemeContext();
  const { t } = useI18n();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const LANG_FLAGS: Record<string, string> = {
    fr: "🇫🇷",
    en: "🇬🇧",
    es: "🇪🇸",
    pt: "🇵🇹",
    de: "🇩🇪",
    it: "🇮🇹",
    ar: "🇸🇦",
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-surface hover:bg-surface-light text-text transition-colors shadow-sm"
        title="Settings"
      >
        <Settings size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text">
              <Globe size={14} />
              <span>Language</span>
            </div>
            <div className="flex gap-1">
              {SUPPORTED_LOCALES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLocale(lang);
                    setIsOpen(false);
                  }}
                  className={`flex-1 py-1 px-2 rounded text-lg ${
                    locale === lang ? "bg-primary text-background" : "text-text-muted hover:bg-surface-light"
                  }`}
                >
                  {LANG_FLAGS[lang] || lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text">
              <Moon size={14} />
              <span>Theme</span>
            </div>
            <div className="flex flex-col gap-1">
              {[
                { value: "system" as ThemePreference, label: "Auto" },
                { value: "light" as ThemePreference, label: "Light" },
                { value: "dark" as ThemePreference, label: "Dark" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPreference(opt.value);
                    setIsOpen(false);
                  }}
                  className={`text-left py-1.5 px-3 rounded text-sm font-medium ${
                    preference === opt.value ? "bg-primary text-background" : "text-text-muted hover:bg-surface-light"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
