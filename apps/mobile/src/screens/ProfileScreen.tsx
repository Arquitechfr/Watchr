import { Text, TouchableOpacity, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { Avatar } from "../components/Avatar";
import { useErrorMessage } from "../services/api";
import { logout, getMe } from "../services/auth.service";
import { log } from "../utils/logger";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors } from "../theme/colors";
import { useState } from "react";
import { useI18n } from "../i18n/useI18n";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function MenuCard({ icon, label, onPress }: MenuCardProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center rounded-lg p-4 mb-3"
      style={{ backgroundColor: colors.surface }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text className="text-text text-base flex-1 ml-3">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout: clearAuth } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [isLoading, setIsLoading] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  async function handleLogout() {
    log("Logout", "start");
    setIsLoading(true);
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
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
    <ScreenContainer className="px-4 pt-6" edges={["top", "left", "right"]}>
      <View className="items-center mb-8">
        <Avatar url={me?.avatarUrl} size={80} />
        <Text className="text-text text-lg font-bold mt-3">{me?.username ?? "..."}</Text>
        <Text className="text-text-muted text-sm">{me?.email}</Text>
      </View>

      <MenuCard
        icon="person-circle"
        label={t("screens.profile.editProfile")}
        onPress={() => navigation.navigate("EditProfile")}
      />
      <MenuCard
        icon="language"
        label={t("screens.profile.language")}
        onPress={() => navigation.navigate("ProfileLanguage")}
      />
      <MenuCard
        icon="library"
        label={t("screens.profile.library")}
        onPress={() => navigation.navigate("Library")}
      />
      <MenuCard
        icon="download"
        label={t("screens.profile.importTvTime")}
        onPress={() => navigation.navigate("Import")}
      />
      <MenuCard
        icon="notifications"
        label={t("screens.profile.notifications")}
        onPress={() => navigation.navigate("ProfileNotifications")}
      />
      <MenuCard
        icon="information-circle"
        label={t("screens.profile.about")}
        onPress={() => navigation.navigate("ProfileAbout")}
      />

      <TouchableOpacity
        className="py-4 rounded-lg items-center mt-4"
        style={{ backgroundColor: colors.danger }}
        onPress={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text className="text-text font-semibold">{t("screens.profile.logout")}</Text>
        )}
      </TouchableOpacity>
    </ScreenContainer>
  );
}
