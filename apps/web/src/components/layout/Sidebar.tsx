import { NavLink, useNavigate } from "react-router-dom";
import { Tv, Film, Search, Newspaper, User, LogOut, Settings, BookMarked } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useI18n } from "../../i18n/useI18n";
import { useThemeContext } from "../../theme/ThemeProvider";

export function Sidebar() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { logout: logoutStore } = useAuthStore();
  const { mode, colors } = useThemeContext();

  const navItems = [
    { to: "/series", icon: Tv, label: t("navigation.series") },
    { to: "/movies", icon: Film, label: t("navigation.movies") },
    { to: "/search", icon: Search, label: t("navigation.search") },
    { to: "/news", icon: Newspaper, label: t("navigation.news") },
    { to: "/library", icon: BookMarked, label: t("navigation.library") },
    { to: "/profile", icon: User, label: t("navigation.profile") },
  ];

  async function handleLogout() {
    logoutStore();
    navigate("/login");
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-surface border-r border-border h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <img
          src="/splash-icon.png"
          alt="Watchr"
          className="w-10 h-10 object-contain"
        />
        <span className="font-bold text-xl" style={{ fontFamily: "Outfit, system-ui, sans-serif", color: mode === "light" ? colors.primary : "white" }}>
          Watchr
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-background"
                  : "text-text-muted hover:bg-surface-light hover:text-text"
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border space-y-1">
        <NavLink
          to="/profile/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-background"
                : "text-text-muted hover:bg-surface-light hover:text-text"
            }`
          }
        >
          <Settings size={20} />
          <span>{t("screens.profile.settings")}</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-light hover:text-text transition-colors"
        >
          <LogOut size={20} />
          {t("screens.profile.logout")}
        </button>
      </div>
    </aside>
  );
}
