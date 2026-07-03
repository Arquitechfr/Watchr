import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { login } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { getErrorMessage } from "../../services/api";
import { log } from "../../utils/logger";
import { colors } from "../../theme/colors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { AuthStackParamList } from "../../navigation/AuthStack";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    log("Login", "start", { email: email.trim() });
    if (!email.trim() || !password.trim()) {
      log("Login", "validation failed");
      showSnackbar("Renseigne ton email et ton mot de passe.", "error");
      return;
    }
    setIsLoading(true);
    try {
      log("Login", "calling api");
      const tokens = await login({ email, password });
      log("Login", "api success, persisting tokens");
      await setTokens(tokens.accessToken, tokens.refreshToken);
      log("Login", "tokens persisted");
      showSnackbar("Connecté avec succès", "success");
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
      <Text className="text-3xl font-bold text-primary mb-2">Watchr</Text>
      <Text className="text-text-muted mb-8">Connecte-toi pour suivre tes séries et films.</Text>

      <TextInput
        className="bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border"
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="bg-surface text-text px-4 py-3 rounded-lg mb-6 border border-border"
        placeholder="Mot de passe"
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
          <Text className="text-background font-semibold text-base">Se connecter</Text>
        )}
      </TouchableOpacity>

      <GoogleSignInButton label="Se connecter avec Google" />

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text className="text-text-muted text-center">
          Pas de compte ? <Text className="text-primary">Créer un compte</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
