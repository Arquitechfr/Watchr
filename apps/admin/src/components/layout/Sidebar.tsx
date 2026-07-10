import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Newspaper,
  Tv,
  Bell,
  Settings,
  Download,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/comments", label: "Comments", icon: MessageSquare },
  { to: "/news-sources", label: "News Sources", icon: Newspaper },
  { to: "/shows", label: "Shows", icon: Tv },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/config", label: "Remote Config", icon: Settings },
  { to: "/imports", label: "Import Jobs", icon: Download },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <span className="text-xl font-bold text-primary">Watchr</span>
        <span className="text-xs text-text-muted">Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors mb-1",
                isActive
                  ? "bg-primary text-background"
                  : "text-text-muted hover:bg-surface-light hover:text-text",
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={toggleTheme}
          className="mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface-light hover:text-text transition-colors"
        >
          <Moon size={18} className="dark:hidden" />
          <Sun size={18} className="hidden dark:block" />
          Toggle theme
        </button>
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background">
            {user?.username?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{user?.username}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-text-muted hover:text-danger">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
