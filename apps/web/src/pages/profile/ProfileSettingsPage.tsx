import { useNavigate } from "react-router-dom";
import { User, Globe, Palette, Database, LogOut, ChevronRight, Bell } from "lucide-react";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { DetailHeader } from "../../components/DetailHeader";
import { CustomAlert } from "../../components/CustomAlert";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useI18n } from "../../i18n/useI18n";

export function ProfileSettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const menuItems = [
    { icon: User, label: t("screens.profile.editProfile"), to: "/profile/edit" },
    { icon: Globe, label: t("screens.profile.language"), to: "/profile/language" },
    { icon: Palette, label: t("screens.profile.appearance"), to: "/profile/appearance" },
    { icon: Bell, label: t("screens.profile.notifications"), to: "/profile/notifications" },
    { icon: Database, label: t("screens.profile.data"), to: "/profile/data" },
  ];

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <DetailHeader title={t("screens.profile.settings")} />

      <div className="space-y-1">
        {menuItems.map(({ icon: Icon, label, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface rounded-lg hover:bg-surface-light transition-colors text-left"
          >
            <Icon size={20} className="text-text-muted shrink-0" />
            <span className="text-text text-sm font-medium flex-1">{label}</span>
            <ChevronRight size={18} className="text-text-muted" />
          </button>
        ))}

        <button
          onClick={() => setShowLogoutAlert(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface rounded-lg hover:bg-surface-light transition-colors text-left mt-4"
        >
          <LogOut size={20} className="text-danger shrink-0" />
          <span className="text-danger text-sm font-medium flex-1">{t("screens.profile.logout")}</span>
        </button>
      </div>

      <CustomAlert
        open={showLogoutAlert}
        title={t("screens.profile.logout")}
        message={t("screens.profile.logoutConfirm")}
        confirmLabel={t("screens.profile.logout")}
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutAlert(false)}
      />
    </PageWrapper>
  );
}
