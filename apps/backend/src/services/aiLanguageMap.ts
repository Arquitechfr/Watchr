import type { SupportedLocale } from "../i18n/translations.js";

const LOCALE_TO_LANGUAGE_NAME: Record<SupportedLocale, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  ar: "Arabic",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
};

export function languageNameForLocale(locale: string): string {
  const base = locale.split("-")[0].toLowerCase() as SupportedLocale;
  return LOCALE_TO_LANGUAGE_NAME[base] ?? "English";
}
