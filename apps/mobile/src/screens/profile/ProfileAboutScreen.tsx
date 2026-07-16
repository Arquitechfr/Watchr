import { View, Text, Linking, TouchableOpacity, ScrollView, Image } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { Seo } from "../../components/Seo";
import Constants from "expo-constants";

export function ProfileAboutScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const legalInfo = [
    { labelKey: "screens.profile.aboutLegalCompanyName", value: "ARQUITECH" },
    { labelKey: "screens.profile.aboutLegalSiret", value: "512 352 501 00088" },
    { labelKey: "screens.profile.aboutLegalAddress", value: "65000 Tarbes, France" },
  ];

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.profileAbout")} />
      <SubScreenHeader title={t("screens.profile.about")} />
      <View className="md:max-w-lg md:mx-auto w-full">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="items-center mb-8 mt-4">
          <Image
            source={require("../../../assets/adaptive-icon.png")}
            style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text className="text-2xl font-bold text-primary mb-2">Watchr</Text>
          <Text className="text-text-muted text-sm">
            {t("screens.profile.aboutVersion")} {version}
          </Text>
        </View>

        <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
          <Text className="text-text text-base leading-relaxed">
            {t("screens.profile.aboutDescription")}
          </Text>
        </View>

        <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
          <Text className="text-text-muted text-sm leading-relaxed">
            {t("screens.profile.aboutCredits")}
          </Text>
        </View>

        <Text className="text-text text-lg font-bold mb-3 mt-2">
          {t("screens.profile.aboutLegalEditor")}
        </Text>
        <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
          {legalInfo.map((item, index) => (
            <View
              key={item.labelKey}
              className={index < legalInfo.length - 1 ? "mb-3" : ""}
            >
              <Text className="text-text-muted text-xs mb-1">
                {t(item.labelKey)}
              </Text>
              <Text className="text-text text-sm">{item.value}</Text>
            </View>
          ))}
          <View className="mt-3">
            <Text className="text-text-muted text-xs mb-1">
              {t("screens.profile.aboutLegalEmail")}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL("mailto:hello@arquitech.fr")}>
              <Text className="text-primary text-sm">hello@arquitech.fr</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-text text-lg font-bold mb-3 mt-2">
          {t("screens.profile.aboutLegalHost")}
        </Text>
        <View className="rounded-lg p-4 mb-10" style={{ backgroundColor: colors.surface }}>
          <View>
            <Text className="text-text-muted text-xs mb-1">
              {t("screens.profile.aboutLegalCompanyName")}
            </Text>
            <Text className="text-text text-sm">Scaleway SAS</Text>
          </View>
          <View className="mt-3">
            <Text className="text-text-muted text-xs mb-1">
              {t("screens.profile.aboutLegalAddress")}
            </Text>
            <Text className="text-text text-sm">8 rue de la Ville L'Évêque, 75008 Paris, France</Text>
          </View>
        </View>
      </ScrollView>
      </View>
    </ScreenContainer>
  );
}
