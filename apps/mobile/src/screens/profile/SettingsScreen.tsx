import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { logout } from "../../services/auth.service";
import { getItem as secureGetItem } from "../../utils/secureStorage";
import { log } from "../../utils/logger";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  target: keyof RootStackParamList;
}

const SETTINGS_ROWS: SettingsRow[] = [
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
  const { logout: clearAuth } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const [isLoading, setIsLoading] = useState(false);

  function handleNavigate(target: keyof RootStackParamList) {
    navigation.navigate(target as never);
  }

  async function handleLogout() {
    log("Logout", "start");
    setIsLoading(true);
    try {
      const refreshToken = await secureGetItem("refreshToken");
      if (refreshToken) {
        log("Logout", "calling api");
        await logout(refreshToken);
      } else {
        log("Logout", "no refresh token");
      }
    } catch (err) {
      log("Logout", "api error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      log("Logout", "clearing auth");
      await clearAuth();
      setIsLoading(false);
      log("Logout", "navigate to auth");
      navigation.navigate("Auth");
    }
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

        <TouchableOpacity
          className="py-4 rounded-lg items-center"
          style={{ backgroundColor: colors.danger }}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text className="font-semibold" style={{ color: "#fff" }}>
              {t("screens.profile.logout")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
