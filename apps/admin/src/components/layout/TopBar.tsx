import { Menu, Moon, Sun } from "lucide-react";
import icon from "../../assets/icon.png";
import { NotificationBell } from "../NotificationBell";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
  }

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex flex-col">
      <div className="h-safe-top bg-surface" />
      <div className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <button
          onClick={onMenuClick}
          className="text-text-muted hover:text-text transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <img src={icon} alt="Watchr" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-semibold text-text">Watchr Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={toggleTheme}
            className="text-text-muted hover:text-text transition-colors"
            aria-label="Toggle theme"
          >
            <Moon size={20} className="dark:hidden" />
            <Sun size={20} className="hidden dark:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
