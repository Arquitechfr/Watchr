import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { resetPassword } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { colors } from "../../theme/colors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { AuthStackParamList } from "../../navigation/AuthStack";

type ResetPasswordRouteProp = RouteProp<AuthStackParamList, "ResetPassword">;

interface ResetPasswordScreenProps {
  route: ResetPasswordRouteProp;
}

export function ResetPasswordScreen({ route }: ResetPasswordScreenProps) {
  const { token } = route.params;
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleReset() {
    if (newPassword.length < 8) {
      showSnackbar(t("auth.passwordTooShort"), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showSnackbar(t("auth.passwordsDoNotMatch"), "error");
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      showSnackbar(t("auth.passwordResetSuccess"), "success");
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenContainer className="px-6 justify-center">
      <Text className="text-2xl font-bold text-text mb-2">{t("auth.resetPasswordTitle")}</Text>
      <Text className="text-text-muted mb-8">{t("auth.resetPasswordBody")}</Text>

      <TextInput
        className="bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border"
        placeholder={t("auth.newPassword")}
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        className="bg-surface text-text px-4 py-3 rounded-lg mb-6 border border-border"
        placeholder={t("auth.confirmPassword")}
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        className="bg-primary py-3 rounded-lg items-center mb-4"
        onPress={handleReset}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text className="text-background font-semibold text-base">{t("auth.resetPasswordButton")}</Text>
        )}
      </TouchableOpacity>
    </ScreenContainer>
  );
}
