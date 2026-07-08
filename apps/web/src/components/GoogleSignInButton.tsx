import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleAuth, type AuthTokens } from "../services/googleAuth.service";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";
import { syncPreferencesToBackend } from "../hooks/useSyncPreferences";

interface GoogleSignInButtonProps {
  label: string;
}

export function GoogleSignInButton({ label }: GoogleSignInButtonProps) {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = useCallback(
    async (tokens: AuthTokens) => {
      setIsSubmitting(true);
      try {
        await setTokens(tokens.accessToken, tokens.refreshToken);
        syncPreferencesToBackend();
        log("GoogleSignInButton", "tokens persisted");
        showSnackbar(t("auth.connectedWithGoogle"), "success");
        navigate("/dashboard");
      } catch (err) {
        log("GoogleSignInButton", "error", err);
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [setTokens, showSnackbar, t, getErrorMessage, navigate],
  );

  const handleError = useCallback(
    (error: Error) => {
      log("GoogleSignInButton", "google error", error);
      showSnackbar(error.message, "error");
    },
    [showSnackbar],
  );

  const { prompt, isLoading } = useGoogleAuth(handleSuccess, handleError);
  const disabled = isLoading || isSubmitting;

  return (
    <button
      type="button"
      className="w-full bg-surface border border-border py-3 rounded-lg items-center mb-4 text-text font-semibold text-base hover:bg-surface-dark transition-colors disabled:opacity-50"
      onClick={prompt}
      disabled={disabled}
    >
      {disabled ? "..." : label}
    </button>
  );
}
