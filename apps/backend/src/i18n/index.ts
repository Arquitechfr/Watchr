import { translations, normalizeLocale, SupportedLocale, DEFAULT_LOCALE } from "./translations.js";

export { normalizeLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./translations.js";

export type I18nKey = keyof typeof translations.en.errors;
export type NotificationKey = keyof typeof translations.en.notifications;
export type EmailKey = keyof typeof translations.en.emails;
export type DiscoverKey = keyof typeof translations.en.discover;
export type RecommendationKey = keyof typeof translations.en.recommendations;

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{{${key}}}`,
  );
}

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

export function translateNotification(
  key: NotificationKey,
  language: SupportedLocale | string | undefined,
  params?: Record<string, string | number>,
): string {
  const locale = normalizeLocale(language);
  const pack = translations[locale] ?? translations[DEFAULT_LOCALE];
  const template = pack.notifications[key] ?? translations[DEFAULT_LOCALE].notifications[key] ?? key;
  return interpolate(template, params);
}

export function translateEmail(
  key: EmailKey,
  language: SupportedLocale | string | undefined,
  params?: Record<string, string | number>,
): string {
  const locale = normalizeLocale(language);
  const pack = translations[locale] ?? translations[DEFAULT_LOCALE];
  const template = pack.emails[key] ?? translations[DEFAULT_LOCALE].emails[key] ?? key;
  return interpolate(template, params);
}

export function translateDiscover(
  key: DiscoverKey,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = translations[locale] ?? translations[DEFAULT_LOCALE];
  return pack.discover[key] ?? translations[DEFAULT_LOCALE].discover[key] ?? key;
}

export function translateRecommendation(
  key: RecommendationKey,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = translations[locale] ?? translations[DEFAULT_LOCALE];
  return pack.recommendations[key] ?? translations[DEFAULT_LOCALE].recommendations[key] ?? key;
}