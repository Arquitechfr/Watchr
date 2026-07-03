import { Text, TouchableOpacity, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { useErrorMessage } from "../services/api";
import { logout, updateLanguage } from "../services/auth.service";
import { log } from "../utils/logger";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors } from "../theme/colors";
import { useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { useLocaleStore } from "../store/localeStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Auth" | "Import">;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout: clearAuth } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t, locale } = useI18n();
  const setLocale = useLocaleStore((state) => state.setLocale);
  const getErrorMessage = useErrorMessage();
  const [isLoading, setIsLoading] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);

  async function changeLanguage(next: "en" | "fr") {
    if (next === locale) return;
    setLanguageLoading(true);
    try {
      await updateLanguage(next);
    } catch (err) {
      log("ProfileScreen", "update language error", err);
    } finally {
      setLocale(next);
      setLanguageLoading(false);
    }
  }

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
    <ScreenContainer className="px-4 pt-4 justify-center" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-primary mb-2 text-center">Watchr</Text>
      <Text className="text-text-muted text-center mb-8">
        {t("screens.profile.title")}
      </Text>

      <View className="bg-surface rounded-lg p-4 mb-4 border border-border">
        <Text className="text-text font-semibold mb-3">{t("screens.profile.language")}</Text>
        <View className="flex-row">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center mr-2 ${locale === "fr" ? "bg-primary" : "bg-surface-light"}`}
            onPress={() => changeLanguage("fr")}
            disabled={languageLoading}
          >
            <Text className={locale === "fr" ? "text-background font-semibold" : "text-text"}>Français</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ml-2 ${locale === "en" ? "bg-primary" : "bg-surface-light"}`}
            onPress={() => changeLanguage("en")}
            disabled={languageLoading}
          >
            <Text className={locale === "en" ? "text-background font-semibold" : "text-text"}>English</Text>
          </TouchableOpacity>
        </View>
        {languageLoading && <ActivityIndicator className="mt-3" color={colors.primary} />}
      </View>

      <TouchableOpacity
        className="bg-surface py-4 rounded-lg items-center mb-4 border border-border flex-row justify-center"
        onPress={() => navigation.navigate("Import")}
      >
        <Ionicons name="download" size={20} color={colors.text} style={{ marginRight: 8 }} />
        <Text className="text-text font-semibold">{t("screens.profile.importTvTime")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-danger py-4 rounded-lg items-center"
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
