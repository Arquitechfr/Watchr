import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { register } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { useThemeContext } from "../theme/ThemeProvider";
import { ScreenContainer } from "../components/ScreenContainer";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { AuthSettingsMenu } from "../components/AuthSettingsMenu";
import { syncPreferencesToBackend } from "../hooks/useSyncPreferences";
import { log } from "../utils/logger";

export function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const { mode, colors } = useThemeContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    log("Register", "start", { email: email.trim() });
    if (!email.trim() || !email.includes("@")) {
      log("Register", "validation failed email");
      showSnackbar(t("auth.invalidEmail"), "error");
      return;
    }
    if (password.length < 8) {
      log("Register", "validation failed password");
      showSnackbar(t("auth.passwordTooShort"), "error");
      return;
    }
    setIsLoading(true);
    try {
      log("Register", "calling api");
      const tokens = await register({ email: email.trim(), password });
      log("Register", "api success, persisting tokens");
      await setTokens(tokens.accessToken, tokens.refreshToken);
      syncPreferencesToBackend();
      log("Register", "tokens persisted");
      showSnackbar(t("auth.connected"), "success");
      navigate("/dashboard");
    } catch (err) {
      log("Register", "error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
      log("Register", "end");
    }
  }

  return (
    <ScreenContainer className="px-6 justify-center items-center">
      <div className="absolute top-4 right-4 flex gap-2">
        <AuthSettingsMenu />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img
            src="/splash-icon.png"
            alt="Watchr"
            className="w-20 h-20 object-contain"
          />
          <h1 className="text-3xl font-bold mt-2" style={{ fontFamily: "Outfit, system-ui, sans-serif", color: mode === "light" ? colors.primary : "white" }}>
            {t("common.appName")}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          ) : (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                className="w-full bg-primary py-3 rounded-lg items-center mb-4 text-background font-semibold text-base hover:bg-primary-dark transition-colors"
                onClick={() => setShowForm(true)}
              >
                {t("auth.registerWithEmail")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <GoogleSignInButton label={t("auth.googleSignUp")} />

        <Link to="/login" className="block text-center text-text-muted mt-4">
          {t("auth.hasAccount")} <span className="text-primary">{t("auth.loginLink")}</span>
        </Link>
      </div>
    </ScreenContainer>
  );
}
