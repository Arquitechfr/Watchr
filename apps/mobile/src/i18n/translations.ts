import fr from "./locales/fr";
import en from "./locales/en";
import es from "./locales/es";
import pt from "./locales/pt";
import de from "./locales/de";
import it from "./locales/it";
import ar from "./locales/ar";
import nl from "./locales/nl";
import pl from "./locales/pl";
import tr from "./locales/tr";
import ru from "./locales/ru";
import ja from "./locales/ja";
import ko from "./locales/ko";
import zh from "./locales/zh";
import {
  SUPPORTED_LANGUAGES as SUPPORTED_LOCALES,
  LANGUAGE_FLAGS as LANG_FLAGS,
  LANGUAGE_I18N_KEYS as LANG_LABELS,
  DEFAULT_LANGUAGE as DEFAULT_LOCALE,
  normalizeLocale,
} from "@watchr/i18n-languages";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export { SUPPORTED_LOCALES, LANG_FLAGS, LANG_LABELS, DEFAULT_LOCALE, normalizeLocale };

export const translations = { en, fr, es, pt, de, it, ar, nl, pl, tr, ru, ja, ko, zh } as const;

export type Translations = typeof fr;

export function getDefaultLocale(): SupportedLocale {
  return DEFAULT_LOCALE;
}
