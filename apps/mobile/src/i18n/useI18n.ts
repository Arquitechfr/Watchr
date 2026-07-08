import { useMemo } from "react";
import { I18n } from "i18n-js";
import { useLocaleStore } from "../store/localeStore";
import { translations, SupportedLocale } from "./translations";
import { Locale } from "date-fns";
import { enUS, fr, es, ptBR, de, it, ar } from "date-fns/locale";

const i18n = new I18n(translations);
i18n.defaultLocale = "en";
i18n.enableFallback = true;

const dateFnsLocales: Record<SupportedLocale, Locale> = {
  en: enUS,
  fr,
  es,
  pt: ptBR,
  de,
  it,
  ar,
};

export function getDateFnsLocale(locale: SupportedLocale): Locale {
  return dateFnsLocales[locale] ?? enUS;
}

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);

  i18n.locale = locale;

  return useMemo(
    () => ({
      locale,
      t: i18n.t.bind(i18n),
      dateFnsLocale: getDateFnsLocale(locale),
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
