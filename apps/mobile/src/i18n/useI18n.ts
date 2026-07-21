import { useMemo } from "react";
import { I18n } from "i18n-js";
import { useLocaleStore } from "../store/localeStore";
import { translations, SupportedLocale } from "./translations";
import { Locale } from "date-fns";
import { enUS } from "date-fns/locale";
import { DATE_FNS_LOCALE_LOADERS } from "@watchr/i18n-languages";

const i18n = new I18n(translations);
i18n.defaultLocale = "en";
i18n.enableFallback = true;

const localeCache: Partial<Record<SupportedLocale, Locale>> = {};

export async function getDateFnsLocale(locale: SupportedLocale): Promise<Locale> {
  if (localeCache[locale]) return localeCache[locale]!;
  const loader = DATE_FNS_LOCALE_LOADERS[locale];
  if (!loader) return enUS;
  const mod = await loader();
  localeCache[locale] = mod as Locale;
  return localeCache[locale]!;
}

export function getDateFnsLocaleSync(locale: SupportedLocale): Locale {
  return localeCache[locale] ?? enUS;
}

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);

  i18n.locale = locale;

  return useMemo(
    () => ({
      locale,
      t: i18n.t.bind(i18n),
      dateFnsLocale: getDateFnsLocaleSync(locale),
    }),
    [locale],
  );
}

export function translate(locale: SupportedLocale, key: string, options?: Record<string, unknown>): string {
  const scoped = new I18n(translations);
  scoped.locale = locale;
  scoped.defaultLocale = "en";
  scoped.enableFallback = true;
  return scoped.t(key, options);
}
