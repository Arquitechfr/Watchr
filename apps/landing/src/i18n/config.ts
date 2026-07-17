import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en";
import fr from "./locales/fr";
import ar from "./locales/ar";
import de from "./locales/de";
import es from "./locales/es";
import it from "./locales/it";
import pt from "./locales/pt";

export const SUPPORTED_LANGUAGES = ["en", "fr", "ar", "de", "es", "it", "pt"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
};

export const LANGUAGE_COUNTRY_CODES: Record<SupportedLanguage, string> = {
  en: "GB",
  fr: "FR",
  ar: "SA",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "PT",
};

export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { landing: en },
      fr: { landing: fr },
      ar: { landing: ar },
      de: { landing: de },
      es: { landing: es },
      it: { landing: it },
      pt: { landing: pt },
    },
    fallbackLng: "en",
    ns: ["landing"],
    defaultNS: "landing",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "watchr-landing-lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lng) => {
  const isRtl = RTL_LANGUAGES.includes(lng as SupportedLanguage);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lng;
});

export default i18n;
