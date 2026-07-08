import { useLocaleStore } from "../store/localeStore";
import { SUPPORTED_LOCALES, type SupportedLocale } from "../i18n/translations";
import { useI18n } from "../i18n/useI18n";

const LANG_LABELS: Record<SupportedLocale, string> = {
  en: "screens.profile.languageEnglish",
  fr: "screens.profile.languageFrench",
  es: "screens.profile.languageSpanish",
  pt: "screens.profile.languagePortuguese",
  de: "screens.profile.languageGerman",
  it: "screens.profile.languageItalian",
  ar: "screens.profile.languageArabic",
};

export function LanguageSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { t } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as SupportedLocale)}
      className="bg-surface text-text px-3 py-1.5 rounded-lg text-sm font-medium border border-border outline-none focus:border-primary transition-colors cursor-pointer"
    >
      {SUPPORTED_LOCALES.map((lang) => (
        <option key={lang} value={lang}>
          {t(LANG_LABELS[lang])}
        </option>
      ))}
    </select>
  );
}
