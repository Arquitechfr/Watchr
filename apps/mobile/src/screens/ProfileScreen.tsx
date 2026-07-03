import { Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { getErrorMessage } from "../services/api";
import { logout } from "../services/auth.service";
import { log } from "../utils/logger";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors } from "../theme/colors";
import { useState } from "react";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Auth">;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout: clearAuth } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

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
        Gère ton compte et tes préférences.
      </Text>

      <TouchableOpacity
        className="bg-surface py-4 rounded-lg items-center mb-4 border border-border"
        onPress={() => navigation.navigate("Main")}
      >
        <Text className="text-text font-semibold">Retour à l'app</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-danger py-4 rounded-lg items-center"
        onPress={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text className="text-text font-semibold">Se déconnecter</Text>
        )}
      </TouchableOpacity>
    </ScreenContainer>
  );
}
