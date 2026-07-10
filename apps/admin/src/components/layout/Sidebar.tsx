import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Flag,
  Newspaper,
  Tv,
  Bell,
  Mail,
  Settings,
  Download,
  LogOut,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { cn } from "../../lib/utils";
import icon from "../../assets/icon.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/comments", label: "Comments", icon: MessageSquare },
  { to: "/reports", label: "Reports", icon: Flag },
  { to: "/news-sources", label: "News Sources", icon: Newspaper },
  { to: "/shows", label: "Shows", icon: Tv },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/email-logs", label: "Email", icon: Mail },
  { to: "/config", label: "Remote Config", icon: Settings },
  { to: "/imports", label: "Import Jobs", icon: Download },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
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
    <>
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-surface transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <img src={icon} alt="Watchr" className="h-8 w-8 rounded-lg" />
            <span className="text-xs text-text-muted">Admin</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-text-muted hover:text-text"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
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
    </>
  );
}
