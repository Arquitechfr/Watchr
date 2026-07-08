import { NavLink } from "react-router-dom";
import { Tv, Film, Search, Newspaper, User } from "lucide-react";
import { useI18n } from "../../i18n/useI18n";

export function BottomNav() {
  const { t } = useI18n();

  const navItems = [
    { to: "/series", icon: Tv, label: t("navigation.series") },
    { to: "/movies", icon: Film, label: t("navigation.movies") },
    { to: "/search", icon: Search, label: "" },
    { to: "/news", icon: Newspaper, label: t("navigation.news") },
    { to: "/profile", icon: User, label: t("navigation.profile") },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isSearch = label === "";
          if (isSearch) {
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center justify-center rounded-full transition-colors -mt-6 ${
                    isActive ? "bg-primary-dark" : "bg-primary"
                  } w-14 h-14 text-background shadow-lg`
                }
              >
                <Icon size={26} />
              </NavLink>
            );
          }
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? "text-primary" : "text-text-muted"
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
