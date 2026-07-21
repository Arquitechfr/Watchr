import { translations, normalizeLocale, SupportedLocale, DEFAULT_LOCALE } from "./translations.js";

export { normalizeLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./translations.js";

export type TranslationPack = typeof translations.en;
export type I18nKey = keyof TranslationPack["errors"];
export type NotificationKey = keyof TranslationPack["notifications"];
export type EmailKey = keyof TranslationPack["emails"];
export type DiscoverKey = keyof TranslationPack["discover"];
export type RecommendationKey = keyof TranslationPack["recommendations"];

const packs = translations as unknown as Record<string, TranslationPack>;
const defaultPack = packs[DEFAULT_LOCALE] ?? translations.en;

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{{${key}}}`,
  );
}

function getPack(locale: SupportedLocale): TranslationPack {
  return packs[locale] ?? defaultPack;
}

export function translateError(
  code: string,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = getPack(locale);
  return pack.errors[code as I18nKey] ?? pack.errors.UNKNOWN;
}

export function translate(
  key: string,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = getPack(locale);
  return pack.errors[key as I18nKey] ?? defaultPack.errors[key as I18nKey] ?? key;
}

export function translateNotification(
  key: NotificationKey,
  language: SupportedLocale | string | undefined,
  params?: Record<string, string | number>,
): string {
  const locale = normalizeLocale(language);
  const pack = getPack(locale);
  const template = pack.notifications[key] ?? defaultPack.notifications[key] ?? key;
  return interpolate(template, params);
}

export function translateEmail(
  key: EmailKey,
  language: SupportedLocale | string | undefined,
  params?: Record<string, string | number>,
): string {
  const locale = normalizeLocale(language);
  const pack = getPack(locale);
  const template = pack.emails[key] ?? defaultPack.emails[key] ?? key;
  return interpolate(template, params);
}

export function translateDiscover(
  key: DiscoverKey,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = getPack(locale);
  return pack.discover[key] ?? defaultPack.discover[key] ?? key;
}

export function translateRecommendation(
  key: RecommendationKey,
  language: SupportedLocale | string | undefined,
): string {
  const locale = normalizeLocale(language);
  const pack = getPack(locale);
  return pack.recommendations[key] ?? defaultPack.recommendations[key] ?? key;
}