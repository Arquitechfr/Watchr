import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, logout as logoutApi, type Me } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { ScreenContainer } from "../components/ScreenContainer";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function DashboardPage() {
  const navigate = useNavigate();
  const { logout: logoutStore, refreshToken } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((err) => {
        showSnackbar(getErrorMessage(err), "error");
      })
      .finally(() => setLoading(false));
  }, [showSnackbar, getErrorMessage]);

  async function handleLogout() {
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // ignore — we clear local state anyway
      }
    }
    logoutStore();
    navigate("/login");
  }

  return (
    <ScreenContainer className="px-6 py-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto w-full mt-16">
        {loading ? (
          <p className="text-text-muted text-center">{t("common.loading")}</p>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-text mb-2">
              {t("screens.home.welcome")}, {me?.username ?? "..."} 👋
            </h1>
            <p className="text-text-muted mb-8">{t("common.appName")}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <button
                onClick={() => navigate("/import")}
                className="bg-surface py-4 px-4 rounded-lg text-text font-semibold hover:bg-surface-light transition-colors text-left"
              >
                <span className="text-xl block mb-1">📥</span>
                {t("screens.profile.importData")}
              </button>
              <button
                onClick={() => navigate("/export")}
                className="bg-surface py-4 px-4 rounded-lg text-text font-semibold hover:bg-surface-light transition-colors text-left"
              >
                <span className="text-xl block mb-1">📤</span>
                {t("screens.profile.exportData")}
              </button>
              <button
                onClick={() => navigate("/help")}
                className="bg-surface py-4 px-4 rounded-lg text-text font-semibold hover:bg-surface-light transition-colors text-left"
              >
                <span className="text-xl block mb-1">❓</span>
                {t("screens.help.title")}
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="bg-primary py-3 px-6 rounded-lg text-background font-semibold text-base hover:bg-primary-dark transition-colors"
            >
              {t("screens.profile.logout")}
            </button>
          </>
        )}
      </div>
    </ScreenContainer>
  );
}
