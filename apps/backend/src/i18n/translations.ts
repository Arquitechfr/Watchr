import en from "./locales/en.js";
import fr from "./locales/fr.js";
import es from "./locales/es.js";
import pt from "./locales/pt.js";
import de from "./locales/de.js";
import it from "./locales/it.js";
import ar from "./locales/ar.js";
import {
  SUPPORTED_LANGUAGES as SUPPORTED_LOCALES,
  DEFAULT_LANGUAGE as DEFAULT_LOCALE,
  normalizeLocale,
} from "@watchr/i18n-languages";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const translations = { en, fr, es, pt, de, it, ar };

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, normalizeLocale };
