import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

export function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      showSnackbar(t("auth.genericError"), "error");
      return;
    }
    setIsLoading(true);
    try {
      const tokens = await register({ email: email.trim(), password });
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate("/dashboard");
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
        <h1 className="text-3xl font-bold text-primary mb-2">{t("common.appName")}</h1>
        <p className="text-text-muted mb-8">{t("auth.registerTitle")}</p>

        <form onSubmit={handleRegister}>
          <input
            type="email"
            className="w-full bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border outline-none focus:border-primary transition-colors"
            placeholder={t("auth.email")}
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full bg-surface text-text px-4 py-3 rounded-lg mb-6 border border-border outline-none focus:border-primary transition-colors"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-primary py-3 rounded-lg items-center mb-4 text-background font-semibold text-base hover:bg-primary-dark transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "..." : t("auth.registerButton")}
          </button>
        </form>

        <Link to="/login" className="block text-center text-text-muted">
          {t("auth.hasAccount")} <span className="text-primary">{t("auth.loginLink")}</span>
        </Link>
      </div>
    </ScreenContainer>
  );
}
