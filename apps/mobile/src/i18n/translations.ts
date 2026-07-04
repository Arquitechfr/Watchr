import fr from "./locales/fr";
import en from "./locales/en";

export const SUPPORTED_LOCALES = ["en", "fr"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const translations = { en, fr } as const;

export type Translations = typeof fr;

export function getDefaultLocale(): SupportedLocale {
  return "en";
}

export function normalizeLocale(raw: string): SupportedLocale {
  const base = raw.split("-")[0].toLowerCase() as SupportedLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : "en";
}
