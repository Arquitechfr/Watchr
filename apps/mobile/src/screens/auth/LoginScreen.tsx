import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator, Image, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { login } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { log } from "../../utils/logger";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { ThemeToggle } from "../../components/ThemeToggle";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { syncPreferencesToBackend } from "../../hooks/useSyncPreferences";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { useI18n } from "../../i18n/useI18n";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleLogin() {
    log("Login", "start", { email: email.trim() });
    if (!email.trim() || !password.trim()) {
      log("Login", "validation failed");
      showSnackbar(t("auth.invalidCredentials"), "error");
      return;
    }
    setIsLoading(true);
    try {
      log("Login", "calling api");
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const tokens = await login({ email: trimmedEmail, password: trimmedPassword });
      log("Login", "api success, persisting tokens");
      await setTokens(tokens.accessToken, tokens.refreshToken);
      syncPreferencesToBackend();
      log("Login", "tokens persisted");
      showSnackbar(t("auth.connected"), "success");
    } catch (err) {
      log("Login", "error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
      log("Login", "end");
    }
  }

  return (
    <ScreenContainer className="px-6 justify-center">
      <View className="absolute top-4 right-4 flex-row gap-1 bg-surface rounded-lg p-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </View>

      <View className="items-center mb-10">
        <Image
          source={require("../../../assets/splash-icon.png")}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-primary mt-4">{t("common.appName")}</Text>
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
          <TextInput
            className="bg-surface text-text px-4 py-3 rounded-lg mb-6 border border-border"
            placeholder={t("auth.password")}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            className="bg-primary py-3 rounded-lg items-center mb-4"
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold text-base">{t("auth.loginButton")}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity
            className="bg-primary py-3 rounded-lg items-center mb-4"
            onPress={() => setShowForm(true)}
          >
            <Text className="text-background font-semibold text-base">{t("auth.loginWithEmail")}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <GoogleSignInButton label={t("auth.googleSignIn")} />

      <TouchableOpacity onPress={() => navigation.navigate("Register")} className="mt-4">
        <Text className="text-text-muted text-center">
          {t("auth.noAccount")}{" "}
          <Text className="text-primary">{t("auth.registerLink")}</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} className="mt-4">
        <Text className="text-primary text-center">{t("auth.forgotPassword")}</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
