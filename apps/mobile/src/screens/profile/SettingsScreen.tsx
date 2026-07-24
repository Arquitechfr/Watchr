import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  target: keyof RootStackParamList;
}

const SETTINGS_ROWS: SettingsRow[] = [
  { icon: "card-outline", labelKey: "screens.profile.subscription", target: "ProfileSubscription" },
  { icon: "language-outline", labelKey: "screens.profile.language", target: "ProfileLanguage" },
  { icon: "color-palette-outline", labelKey: "screens.profile.appearance", target: "ProfileAppearance" },
  { icon: "notifications-outline", labelKey: "screens.profile.notifications", target: "ProfileNotifications" },
  { icon: "server-outline", labelKey: "screens.profile.myData", target: "ProfileData" },
  { icon: "mail-outline", labelKey: "screens.profile.contact", target: "ProfileContact" },
  { icon: "key-outline", labelKey: "screens.profile.apiKeys", target: "ProfileApiKeys" },
];

export function SettingsScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();

  function handleNavigate(target: keyof RootStackParamList) {
    navigation.navigate(target as never);
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.profileSettings")} />
      <SubScreenHeader title={t("screens.profile.settings")} />
      <ScrollView className="md:max-w-lg md:mx-auto w-full" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="gap-3 mb-8">
          {SETTINGS_ROWS.map((row) => (
            <TouchableOpacity
              key={row.target}
              onPress={() => handleNavigate(row.target)}
              className="flex-row items-center rounded-lg p-4"
              style={{ backgroundColor: colors.surface }}
              activeOpacity={0.7}
            >
              <Ionicons name={row.icon} size={20} color={colors.primary} />
              <Text className="text-text text-base flex-1 ml-3">{t(row.labelKey)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
