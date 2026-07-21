import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type ParamListBase } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { useI18n } from "../../i18n/useI18n";
import { useChangeLocale } from "../../hooks/useChangeLocale";
import { useThemeColors } from "../../theme/useThemeColors";
import { Seo } from "../../components/Seo";
import { SUPPORTED_LOCALES, LANG_FLAGS, LANG_LABELS, type SupportedLocale } from "../../i18n/translations";

export function ProfileLanguageScreen() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const changeLocale = useChangeLocale();
  const [isChanging, setIsChanging] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  useEffect(() => {
    if (!isChanging) return;
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation, isChanging]);

  async function handleLanguageChange(lang: SupportedLocale) {
    if (lang === locale || isChanging) return;
    setIsChanging(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      await changeLocale(lang);
    } finally {
      setIsChanging(false);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.profileLanguage")} />
      <SubScreenHeader title={t("screens.profile.language")} />
      <ScrollView className="md:max-w-lg md:mx-auto w-full" showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 pb-8">
        {SUPPORTED_LOCALES.map((lang) => (
          <TouchableOpacity
            key={lang}
            onPress={() => handleLanguageChange(lang)}
            className="flex-row items-center rounded-xl p-4"
            style={{ backgroundColor: colors.surface }}
            activeOpacity={0.7}
            disabled={isChanging}
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
      </ScrollView>
      <LoadingOverlay visible={isChanging} label={t("common.changingLanguage")} subtitle={t("common.changingLanguageHint")} />
    </ScreenContainer>
  );
}
