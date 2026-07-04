import en from "./locales/en.js";
import fr from "./locales/fr.js";

export const SUPPORTED_LOCALES = ["en", "fr"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const translations = { en, fr };

export function normalizeLocale(raw: string | undefined): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;
  const base = raw.split("-")[0].toLowerCase() as SupportedLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}
