import { useLocaleStore } from "../store/localeStore";
import { SUPPORTED_LOCALES } from "../i18n/translations";

export function LanguageSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div className="flex gap-1 bg-surface rounded-lg p-1">
      {SUPPORTED_LOCALES.map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors uppercase ${
            locale === lang
              ? "bg-primary text-background"
              : "text-text-muted hover:text-text"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
