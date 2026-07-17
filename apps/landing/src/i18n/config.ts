import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en";

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

const localeLoaders: Partial<Record<SupportedLanguage, () => Promise<{ default: Record<string, unknown> }>>> = {
  fr: () => import("./locales/fr"),
  ar: () => import("./locales/ar"),
  de: () => import("./locales/de"),
  es: () => import("./locales/es"),
  it: () => import("./locales/it"),
  pt: () => import("./locales/pt"),
};

const loadedLocales = new Set<SupportedLanguage>(["en"]);

export async function loadLocale(lang: SupportedLanguage): Promise<void> {
  if (loadedLocales.has(lang)) return;
  const loader = localeLoaders[lang];
  if (!loader) return;

  const { default: locale } = await loader();
  i18n.addResourceBundle(lang, "landing", locale);
  loadedLocales.add(lang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { landing: en },
    },
    fallbackLng: "en",
    ns: ["landing"],
    defaultNS: "landing",
    partialBundledLanguages: true,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "watchr-landing-lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

const detectedLang = (i18n.language?.split("-")[0] ?? "en") as SupportedLanguage;
if (detectedLang !== "en") {
  loadLocale(detectedLang).then(() => {
    i18n.changeLanguage(detectedLang);
  });
}

i18n.on("languageChanged", (lng) => {
  const isRtl = RTL_LANGUAGES.includes(lng as SupportedLanguage);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lng;
});

export default i18n;
