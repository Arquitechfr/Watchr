// Single source of truth for all supported languages across Watchr apps

export const SUPPORTED_LANGUAGES = [
  "en", "fr", "es", "pt", "de", "it", "ar",
  "nl", "pl", "tr", "ru", "ja", "ko", "zh",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

// Native labels for display in UIs
export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  it: "Italiano",
  ar: "العربية",
  nl: "Nederlands",
  pl: "Polski",
  tr: "Türkçe",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
};

// ISO 3166-1 alpha-2 country codes for flag icons (country-flag-icons)
export const LANGUAGE_COUNTRY_CODES: Record<SupportedLanguage, string> = {
  en: "GB",
  fr: "FR",
  es: "ES",
  pt: "PT",
  de: "DE",
  it: "IT",
  ar: "SA",
  nl: "NL",
  pl: "PL",
  tr: "TR",
  ru: "RU",
  ja: "JP",
  ko: "KR",
  zh: "CN",
};

// Emoji flags (for mobile and admin)
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  pt: "🇵🇹",
  de: "🇩🇪",
  it: "🇮🇹",
  ar: "🇸🇦",
  nl: "🇳🇱",
  pl: "🇵🇱",
  tr: "🇹🇷",
  ru: "🇷🇺",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
};

// Right-to-left languages
export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

// i18n keys for language names in the mobile app
export const LANGUAGE_I18N_KEYS: Record<SupportedLanguage, string> = {
  en: "screens.profile.languageEnglish",
  fr: "screens.profile.languageFrench",
  es: "screens.profile.languageSpanish",
  pt: "screens.profile.languagePortuguese",
  de: "screens.profile.languageGerman",
  it: "screens.profile.languageItalian",
  ar: "screens.profile.languageArabic",
  nl: "screens.profile.languageDutch",
  pl: "screens.profile.languagePolish",
  tr: "screens.profile.languageTurkish",
  ru: "screens.profile.languageRussian",
  ja: "screens.profile.languageJapanese",
  ko: "screens.profile.languageKorean",
  zh: "screens.profile.languageChinese",
};

// date-fns locale loaders (lazy)
// Using `unknown` type to avoid pulling date-fns types into this package
export const DATE_FNS_LOCALE_LOADERS: Record<SupportedLanguage, () => Promise<unknown>> = {
  en: () => import("date-fns/locale").then((m) => m.enUS),
  fr: () => import("date-fns/locale").then((m) => m.fr),
  es: () => import("date-fns/locale").then((m) => m.es),
  pt: () => import("date-fns/locale").then((m) => m.ptBR),
  de: () => import("date-fns/locale").then((m) => m.de),
  it: () => import("date-fns/locale").then((m) => m.it),
  ar: () => import("date-fns/locale").then((m) => m.ar),
  nl: () => import("date-fns/locale").then((m) => m.nl),
  pl: () => import("date-fns/locale").then((m) => m.pl),
  tr: () => import("date-fns/locale").then((m) => m.tr),
  ru: () => import("date-fns/locale").then((m) => m.ru),
  ja: () => import("date-fns/locale").then((m) => m.ja),
  ko: () => import("date-fns/locale").then((m) => m.ko),
  zh: () => import("date-fns/locale").then((m) => m.zhCN),
};

// Admin-compatible language object
export interface AdminLanguage {
  code: string;
  label: string;
  flag: string;
}

export const ADMIN_LANGUAGES: AdminLanguage[] = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  label: LANGUAGE_LABELS[code],
  flag: LANGUAGE_FLAGS[code],
}));

export function normalizeLocale(raw: string | undefined): SupportedLanguage {
  if (!raw) return DEFAULT_LANGUAGE;
  const base = raw.split("-")[0].toLowerCase() as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
}
