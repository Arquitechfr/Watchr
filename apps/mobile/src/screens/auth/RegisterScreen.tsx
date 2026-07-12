import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator, Image, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { register } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { log } from "../../utils/logger";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { AuthSettingsMenu } from "../../components/AuthSettingsMenu";
import { syncPreferencesToBackend } from "../../hooks/useSyncPreferences";
import { prefetchSeriesData } from "../../utils/prefetch";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { useI18n } from "../../i18n/useI18n";
import { useRemoteConfig } from "../../hooks/useRemoteConfig";
import { Seo } from "../../components/Seo";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const config = useRemoteConfig();
  const queryClient = useQueryClient();
  const authDisabled = !config.auth_enabled;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const insets = useSafeAreaInsets();

  async function handleRegister() {
    log("Register", "start", { email: email.trim() });
    if (!email.trim() || !email.includes("@")) {
      log("Register", "validation failed email");
      showSnackbar(t("auth.invalidEmail"), "error");
      return;
    }
    if (password.length < 8) {
      log("Register", "validation failed password");
      showSnackbar(t("auth.passwordTooShort"), "error");
      return;
    }
    setIsLoading(true);
    try {
      log("Register", "calling api");
      const tokens = await register({ email: email.trim(), password });
      log("Register", "api success, persisting tokens");
      await setTokens(tokens.accessToken, tokens.refreshToken);
      syncPreferencesToBackend();
      prefetchSeriesData(queryClient);
      log("Register", "tokens persisted");
      showSnackbar(t("auth.connected"), "success");
    } catch (err) {
      log("Register", "error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
      log("Register", "end");
    }
  }

  return (
    <ScreenContainer className="px-6 justify-center" fullWidth>
      <Seo title={t("seo.register")} />
      <View style={Platform.OS === "web" ? { maxWidth: 400, width: "100%", alignSelf: "center" } : undefined}>
      <View style={{ top: insets.top + 8, zIndex: 50 }} className="absolute right-4">
        <AuthSettingsMenu />
      </View>

      <View className="items-center mb-10">
        <Image
          source={require("../../../assets/splash-icon.webp")}
          style={{ width: 80, height: 80 }}
          resizeMode="contain"
        />
        <Text
          style={{ fontFamily: "Outfit_700Bold", fontSize: 32 }}
          className="text-primary mt-2"
        >
          {t("common.appName")}
        </Text>
      </View>

      {showForm ? (
        <Animated.View entering={SlideInDown.springify().damping(20).stiffness(200)} exiting={FadeOut.duration(200)}>
          <TextInput
            className="bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border"
            placeholder={t("auth.email")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View className="mb-6">
            <TextInput
              className="bg-surface text-text px-4 py-3 rounded-lg border border-border pr-12"
              placeholder={t("auth.password")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-primary py-3 rounded-lg items-center mb-4"
            onPress={handleRegister}
            disabled={isLoading || authDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold text-base">{t("auth.registerButton")}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity
            className="bg-primary py-3 rounded-lg items-center mb-4"
            onPress={() => setShowForm(true)}
            disabled={authDisabled}
          >
            <Text className="text-background font-semibold text-base">{t("auth.registerWithEmail")}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {authDisabled && (
        <Text className="text-text-muted text-center text-sm mb-4">
          {t("authDisabled.message")}
        </Text>
      )}

      <GoogleSignInButton label={t("auth.googleSignUp")} />

      <TouchableOpacity onPress={() => navigation.navigate("Login")} className="mt-4">
        <Text className="text-text-muted text-center">
          {t("auth.hasAccount")}{" "}
          <Text className="text-primary">{t("auth.loginLink")}</Text>
        </Text>
      </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
