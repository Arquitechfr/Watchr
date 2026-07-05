import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { register } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { log } from "../../utils/logger";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { useI18n } from "../../i18n/useI18n";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    log("Register", "start", { email: email.trim() });
    if (!email.trim() || password.length < 8) {
      log("Register", "validation failed");
      showSnackbar(t("auth.genericError"), "error");
      return;
    }
    setIsLoading(true);
    try {
      log("Register", "calling api");
      const tokens = await register({ email: email.trim(), password });
      log("Register", "api success, persisting tokens");
      await setTokens(tokens.accessToken, tokens.refreshToken);
      log("Register", "tokens persisted");
      showSnackbar(t("auth.connectedWithGoogle"), "success");
    } catch (err) {
      log("Register", "error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
      log("Register", "end");
    }
  }

  return (
    <ScreenContainer className="px-6 justify-center">
      <Text className="text-3xl font-bold text-primary mb-2">{t("common.appName")}</Text>
      <Text className="text-text-muted mb-8">{t("auth.registerTitle")}</Text>

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
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text className="text-background font-semibold text-base">{t("auth.registerButton")}</Text>
        )}
      </TouchableOpacity>

      <GoogleSignInButton label={t("auth.googleSignIn")} />

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text className="text-text-muted text-center">
          {t("auth.hasAccount")}{" "}
          <Text className="text-primary">{t("auth.loginLink")}</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
