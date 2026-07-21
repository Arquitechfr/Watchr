import en from "./locales/en.js";
import fr from "./locales/fr.js";
import es from "./locales/es.js";
import pt from "./locales/pt.js";
import de from "./locales/de.js";
import it from "./locales/it.js";
import ar from "./locales/ar.js";
import nl from "./locales/nl.js";
import pl from "./locales/pl.js";
import tr from "./locales/tr.js";
import ru from "./locales/ru.js";
import ja from "./locales/ja.js";
import ko from "./locales/ko.js";
import zh from "./locales/zh.js";
import {
  SUPPORTED_LANGUAGES as SUPPORTED_LOCALES,
  DEFAULT_LANGUAGE as DEFAULT_LOCALE,
  normalizeLocale,
} from "@watchr/i18n-languages";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const translations = { en, fr, es, pt, de, it, ar, nl, pl, tr, ru, ja, ko, zh };

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, normalizeLocale };
