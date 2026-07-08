import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../services/auth.service";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";

export function ForgotPasswordPage() {
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
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
    <ScreenContainer className="px-6 justify-center">
      <h2 className="text-2xl font-bold text-text mb-2">{t("auth.forgotPasswordTitle")}</h2>
      <p className="text-text-muted mb-8">{t("auth.forgotPasswordBody")}</p>

      {sent ? (
        <p className="text-text-muted text-center mb-6">{t("auth.resetEmailSentDescription")}</p>
      ) : (
        <form onSubmit={handleSend}>
          <input
            type="email"
            className="w-full bg-surface text-text px-4 py-3 rounded-lg mb-6 border border-border outline-none focus:border-primary transition-colors"
            placeholder={t("auth.email")}
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-primary py-3 rounded-lg items-center mb-4 text-background font-semibold text-base hover:bg-primary-dark transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "..." : t("auth.sendResetLink")}
          </button>
        </form>
      )}

      <Link to="/login" className="block text-center text-primary">
        {t("auth.backToLogin")}
      </Link>
    </ScreenContainer>
  );
}
