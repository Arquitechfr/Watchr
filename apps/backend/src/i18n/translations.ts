import en from "./locales/en.js";
import fr from "./locales/fr.js";
import es from "./locales/es.js";
import pt from "./locales/pt.js";
import de from "./locales/de.js";
import it from "./locales/it.js";
import ar from "./locales/ar.js";

export const SUPPORTED_LOCALES = ["en", "fr", "es", "pt", "de", "it", "ar"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const translations = { en, fr, es, pt, de, it, ar };

export function normalizeLocale(raw: string | undefined): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;
  const base = raw.split("-")[0].toLowerCase() as SupportedLocale;
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}
