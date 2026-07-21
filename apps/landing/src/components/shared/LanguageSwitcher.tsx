import { useState, useRef, useEffect, type ComponentType } from "react";
import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_COUNTRY_CODES,
  loadLocale,
  type SupportedLanguage,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

// Import only the flag icons we need (country-flag-icons uses strict exports)
import GB from "country-flag-icons/react/3x2/GB";
import FR from "country-flag-icons/react/3x2/FR";
import ES from "country-flag-icons/react/3x2/ES";
import PT from "country-flag-icons/react/3x2/PT";
import DE from "country-flag-icons/react/3x2/DE";
import IT from "country-flag-icons/react/3x2/IT";
import SA from "country-flag-icons/react/3x2/SA";
import NL from "country-flag-icons/react/3x2/NL";
import PL from "country-flag-icons/react/3x2/PL";
import TR from "country-flag-icons/react/3x2/TR";
import RU from "country-flag-icons/react/3x2/RU";
import JP from "country-flag-icons/react/3x2/JP";
import KR from "country-flag-icons/react/3x2/KR";
import CN from "country-flag-icons/react/3x2/CN";

const FLAG_COMPONENTS: Record<string, ComponentType<{ className?: string }>> = {
  GB, FR, ES, PT, DE, IT, SA, NL, PL, TR, RU, JP, KR, CN,
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLang = (i18n.language?.split("-")[0] ?? "en") as SupportedLanguage;
  const CurrentFlag = FLAG_COMPONENTS[LANGUAGE_COUNTRY_CODES[currentLang]];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = async (lang: SupportedLanguage) => {
    await loadLocale(lang);
    i18n.changeLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 transition-colors hover:bg-surface-light"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <Globe className="h-5 w-5 text-text-muted" />
        {CurrentFlag && <CurrentFlag className="h-3.5 w-5 rounded-sm" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-border bg-surface shadow-lg overflow-hidden">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const Flag = FLAG_COMPONENTS[LANGUAGE_COUNTRY_CODES[lang]];
            return (
              <button
                key={lang}
                onClick={() => changeLanguage(lang)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-surface-light",
                  currentLang === lang && "text-primary font-medium",
                )}
              >
                <span className="flex items-center gap-2.5">
                  {Flag && <Flag className="h-3.5 w-5 rounded-sm" />}
                  {LANGUAGE_LABELS[lang]}
                </span>
                {currentLang === lang && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
