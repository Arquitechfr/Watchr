import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { useLocaleStore } from "../../store/localeStore";
import { updateLanguage } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useI18n } from "../../i18n/useI18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "../../i18n/translations";
import { Check } from "lucide-react";

const LANG_FLAGS: Record<SupportedLocale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  pt: "🇵🇹",
  de: "🇩🇪",
  it: "🇮🇹",
  ar: "🇸🇦",
};

const LANG_LABELS: Record<SupportedLocale, string> = {
  fr: "screens.profile.languageFrench",
  en: "screens.profile.languageEnglish",
  es: "screens.profile.languageSpanish",
  pt: "screens.profile.languagePortuguese",
  de: "screens.profile.languageGerman",
  it: "screens.profile.languageItalian",
  ar: "screens.profile.languageArabic",
};

export function LanguagePage() {
  const { t, locale } = useI18n();
  const { setLocale } = useLocaleStore();
  const { showSnackbar } = useUIStore();

  async function handleSelect(code: SupportedLocale) {
    if (code === locale) return;
    setLocale(code);
    updateLanguage(code).catch((error) => {
      showSnackbar(t("screens.profile.languageSyncError"), "error");
    });
  }

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.language")} />

      <div className="space-y-1">
        {SUPPORTED_LOCALES.map((code) => (
          <button
            key={code}
            onClick={() => handleSelect(code)}
            className="w-full flex items-center px-4 py-3.5 bg-surface rounded-lg hover:bg-surface-light transition-colors"
          >
            <span className="text-3xl mr-4">{LANG_FLAGS[code]}</span>
            <span className="text-text text-sm font-medium flex-1 text-left">{t(LANG_LABELS[code])}</span>
            {locale === code && <Check size={20} className="text-primary" />}
          </button>
        ))}
      </div>
    </PageWrapper>
  );
}
