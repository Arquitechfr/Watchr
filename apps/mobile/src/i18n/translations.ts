import fr from "./locales/fr";
import en from "./locales/en";
import es from "./locales/es";
import pt from "./locales/pt";
import de from "./locales/de";
import it from "./locales/it";
import ar from "./locales/ar";
import {
  SUPPORTED_LANGUAGES as SUPPORTED_LOCALES,
  LANGUAGE_FLAGS as LANG_FLAGS,
  LANGUAGE_I18N_KEYS as LANG_LABELS,
  DEFAULT_LANGUAGE as DEFAULT_LOCALE,
  normalizeLocale,
} from "@watchr/i18n-languages";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export { SUPPORTED_LOCALES, LANG_FLAGS, LANG_LABELS, DEFAULT_LOCALE, normalizeLocale };

export const translations = { en, fr, es, pt, de, it, ar } as const;

export type Translations = typeof fr;

export function getDefaultLocale(): SupportedLocale {
  return DEFAULT_LOCALE;
}
