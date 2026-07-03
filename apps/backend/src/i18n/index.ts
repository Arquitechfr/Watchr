import { translations, normalizeLocale, SupportedLocale, DEFAULT_LOCALE } from "./translations.js";

export { normalizeLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./translations.js";

export type I18nKey = keyof typeof translations.en.errors;

export function translateError(
  code: string,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = translations[locale] ?? translations[DEFAULT_LOCALE];
  return pack.errors[code as I18nKey] ?? pack.errors.UNKNOWN;
}

export function translate(
  key: string,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = translations[locale] ?? translations[DEFAULT_LOCALE];
  return pack.errors[key as I18nKey] ?? translations[DEFAULT_LOCALE].errors[key as I18nKey] ?? key;
}
