import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/auth.service";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
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
    <ScreenContainer className="px-6 justify-center items-center">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/splash-icon.png"
            alt="Watchr"
            className="w-16 h-16 object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">{t("auth.resetPasswordTitle")}</h2>
        <p className="text-text-muted mb-8">{t("auth.resetPasswordBody")}</p>

        <form onSubmit={handleReset}>
          <input
            type="password"
            className="w-full bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border outline-none focus:border-primary transition-colors"
            placeholder={t("auth.newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full bg-surface text-text px-4 py-3 rounded-lg mb-6 border border-border outline-none focus:border-primary transition-colors"
            placeholder={t("auth.confirmPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-primary py-3 rounded-lg items-center mb-4 text-background font-semibold text-base hover:bg-primary-dark transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "..." : t("auth.resetPasswordButton")}
          </button>
        </form>

        <Link to="/login" className="block text-center text-primary">
          {t("auth.backToLogin")}
        </Link>
      </div>
    </ScreenContainer>
  );
}
