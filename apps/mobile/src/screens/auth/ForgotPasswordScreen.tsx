import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator, View, Platform } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { requestPasswordReset } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { useI18n } from "../../i18n/useI18n";
import { Seo } from "../../components/Seo";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      showSnackbar(t("auth.invalidCredentials"), "error");
      return;
    }
    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      showSnackbar(t("auth.resetEmailSent"), "success");
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenContainer className="px-6" fullWidth>
      <Seo title={t("seo.forgotPassword")} />
      <KeyboardAwareScrollView
        mode="layout"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={Platform.OS === "web" ? { flexGrow: 1, justifyContent: "center", maxWidth: 400, width: "100%", alignSelf: "center" } : { flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
      <View style={Platform.OS === "web" ? undefined : { width: "100%" }}>
      <Text className="text-2xl font-bold text-text mb-2">{t("auth.forgotPasswordTitle")}</Text>
      <Text className="text-text-muted mb-8">{t("auth.forgotPasswordBody")}</Text>

      {sent ? (
        <Text className="text-text-muted text-center mb-6">{t("auth.resetEmailSentDescription")}</Text>
      ) : (
        <>
          <TextInput
            className="bg-surface text-text px-4 py-3 rounded-lg mb-6 border border-border"
            placeholder={t("auth.email")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity
            className="bg-primary py-3 rounded-lg items-center mb-4"
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold text-base">{t("auth.sendResetLink")}</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text className="text-primary text-center">{t("auth.backToLogin")}</Text>
      </TouchableOpacity>
      </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}
