import { useCallback, useState } from "react";
import { Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useGoogleAuthRequest } from "../services/googleAuth.service";
import { loginWithGoogle } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { getErrorMessage } from "../services/api";
import { log } from "../utils/logger";
import { colors } from "../theme/colors";

interface GoogleSignInButtonProps {
  label: string;
}

export function GoogleSignInButton({ label }: GoogleSignInButtonProps) {
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = useCallback(
    async (idToken: string) => {
      setIsSubmitting(true);
      try {
        log("GoogleSignInButton", "backend login");
        const tokens = await loginWithGoogle(idToken);
        await setTokens(tokens.accessToken, tokens.refreshToken);
        log("GoogleSignInButton", "tokens persisted");
        showSnackbar("Connecté avec Google", "success");
      } catch (err) {
        log("GoogleSignInButton", "error", err);
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [setTokens, showSnackbar],
  );

  const handleError = useCallback(
    (error: Error) => {
      log("GoogleSignInButton", "google error", error);
      showSnackbar(error.message, "error");
    },
    [showSnackbar],
  );

  const { prompt, isLoading } = useGoogleAuthRequest(handleSuccess, handleError);
  const disabled = isLoading || isSubmitting;

  return (
    <TouchableOpacity
      className="bg-surface border border-border py-3 rounded-lg items-center mb-4"
      onPress={prompt}
      disabled={disabled}
    >
      {disabled ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Text className="text-text font-semibold text-base">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
