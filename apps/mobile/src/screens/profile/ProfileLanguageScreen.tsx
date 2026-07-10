import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { useLocaleStore } from "../../store/localeStore";
import { useChangeLocale } from "../../hooks/useChangeLocale";
import { useThemeColors } from "../../theme/useThemeColors";
import { SUPPORTED_LOCALES, LANG_FLAGS, LANG_LABELS, type SupportedLocale } from "../../i18n/translations";

export function ProfileLanguageScreen() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const setLocale = useLocaleStore((state) => state.setLocale);
  const changeLocale = useChangeLocale();

  function handleLanguageChange(lang: SupportedLocale) {
    if (lang === locale) return;
    setLocale(lang);
    changeLocale(lang);
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Text className="text-text-muted text-center mb-6">{t("screens.profile.language")}</Text>
      <View className="gap-3">
        {SUPPORTED_LOCALES.map((lang) => (
          <TouchableOpacity
            key={lang}
            onPress={() => handleLanguageChange(lang)}
            className="flex-row items-center rounded-xl p-4"
            style={{ backgroundColor: colors.surface }}
            activeOpacity={0.7}
          >
            <Text className="text-3xl mr-4">{LANG_FLAGS[lang]}</Text>
            <Text className="text-text text-base flex-1">
              {t(LANG_LABELS[lang])}
            </Text>
            {locale === lang && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScreenContainer>
  );
}
