import { TouchableOpacity, Text } from "react-native";
import { useLocaleStore } from "../store/localeStore";
import { SUPPORTED_LOCALES } from "../i18n/translations";

export function LanguageSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <>
      {SUPPORTED_LOCALES.map((lang) => (
        <TouchableOpacity
          key={lang}
          onPress={() => setLocale(lang)}
          className={`px-3 py-1.5 rounded-md ${
            locale === lang ? "bg-primary" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium uppercase ${
              locale === lang ? "text-background" : "text-text-muted"
            }`}
          >
            {lang}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );
}
