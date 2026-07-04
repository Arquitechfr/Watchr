import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { useLocaleStore } from "../../store/localeStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { updateLanguage } from "../../services/auth.service";
import { colors } from "../../theme/colors";
import { useState } from "react";
import { SUPPORTED_LOCALES, type SupportedLocale } from "../../i18n/translations";

export function ProfileLanguageScreen() {
  const { t, locale } = useI18n();
  const setLocale = useLocaleStore((state) => state.setLocale);
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleLanguageChange(lang: SupportedLocale) {
    if (lang === locale) return;
    setLoading(lang);
    try {
      await updateLanguage(lang);
      setLocale(lang);
    } catch (error) {
      showSnackbar(getErrorMessage(error), "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-text-muted text-center mb-6">{t("screens.profile.language")}</Text>
      <View className="gap-3">
        {SUPPORTED_LOCALES.map((lang) => (
          <TouchableOpacity
            key={lang}
            onPress={() => handleLanguageChange(lang)}
            className="flex-row items-center justify-between rounded-lg p-4"
            style={{ backgroundColor: colors.surface }}
            disabled={loading !== null}
          >
            <Text className="text-text text-base">
              {lang === "fr" ? "Français" : "English"}
            </Text>
            {loading === lang ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : locale === lang ? (
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 24, height: 24, backgroundColor: colors.primary }}
              >
                <Text className="text-background font-bold text-xs">✓</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </ScreenContainer>
  );
}
