import { ADMIN_LANGUAGES, type AdminLanguage } from "@watchr/i18n-languages";

export type { AdminLanguage as SupportedLanguage };

export const SUPPORTED_LANGUAGES: AdminLanguage[] = ADMIN_LANGUAGES;

export const LANGUAGE_FLAGS: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.flag]),
);

export const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label]),
);
