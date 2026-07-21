import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { RouteProp } from "@react-navigation/native";
import { resetPassword } from "../../services/auth.service";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { Seo } from "../../components/Seo";

type ResetPasswordRouteProp = RouteProp<AuthStackParamList, "ResetPassword">;

interface ResetPasswordScreenProps {
  route: ResetPasswordRouteProp;
}

export function ResetPasswordScreen({ route }: ResetPasswordScreenProps) {
  const { token } = route.params;
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <ScreenContainer className="px-6" fullWidth>
      <Seo title={t("seo.resetPassword")} />
      <KeyboardAwareScrollView
        mode="layout"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={Platform.OS === "web" ? { flexGrow: 1, justifyContent: "center", maxWidth: 400, width: "100%", alignSelf: "center" } : { flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
      <View style={Platform.OS === "web" ? undefined : { width: "100%" }}>
      <Text className="text-2xl font-bold text-text mb-2">{t("auth.resetPasswordTitle")}</Text>
      <Text className="text-text-muted mb-8">{t("auth.resetPasswordBody")}</Text>

      <View className="mb-4">
        <TextInput
          className="bg-surface text-text px-4 py-3 rounded-lg border border-border pr-12"
          placeholder={t("auth.newPassword")}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity
          onPress={() => setShowNewPassword(!showNewPassword)}
          className="absolute right-3 top-3"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showNewPassword ? "eye-off" : "eye"}
            size={22}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      <View className="mb-6">
        <TextInput
          className="bg-surface text-text px-4 py-3 rounded-lg border border-border pr-12"
          placeholder={t("auth.confirmPassword")}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-3"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={22}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

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
      </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}
