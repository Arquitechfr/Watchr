import { useMemo } from "react";
import { I18n } from "i18n-js";
import { useLocaleStore } from "../store/localeStore";
import { translations, type SupportedLocale } from "./translations";
import type { Locale } from "date-fns";
import { enUS, fr } from "date-fns/locale";

const i18n = new I18n(translations);
i18n.defaultLocale = "en";
i18n.enableFallback = true;

const dateFnsLocales: Record<SupportedLocale, Locale> = {
  en: enUS,
  fr,
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
