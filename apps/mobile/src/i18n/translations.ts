import fr from "./locales/fr";
import en from "./locales/en";
import es from "./locales/es";
import pt from "./locales/pt";
import de from "./locales/de";
import it from "./locales/it";
import ar from "./locales/ar";

export const SUPPORTED_LOCALES = ["en", "fr", "es", "pt", "de", "it", "ar"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LANG_FLAGS: Record<SupportedLocale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  pt: "🇵🇹",
  de: "🇩🇪",
  it: "🇮🇹",
  ar: "🇸🇦",
};

export const LANG_LABELS: Record<SupportedLocale, string> = {
  fr: "screens.profile.languageFrench",
  en: "screens.profile.languageEnglish",
  es: "screens.profile.languageSpanish",
  pt: "screens.profile.languagePortuguese",
  de: "screens.profile.languageGerman",
  it: "screens.profile.languageItalian",
  ar: "screens.profile.languageArabic",
};

export const translations = { en, fr, es, pt, de, it, ar } as const;

export type Translations = typeof fr;

export function getDefaultLocale(): SupportedLocale {
  return "en";
}

export function normalizeLocale(raw: string): SupportedLocale {
  const base = raw.split("-")[0].toLowerCase() as SupportedLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : "en";
}
