import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Library, Database, Bell, MoreVertical } from "lucide-react";
import { useI18n } from "../i18n/useI18n";

interface MenuItem {
  icon: React.ReactNode;
  labelKey: string;
  target: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: <Settings size={20} />, labelKey: "screens.profile.settings", target: "/profile/settings" },
  { icon: <Library size={20} />, labelKey: "screens.profile.library", target: "/library" },
  { icon: <Database size={20} />, labelKey: "screens.profile.myData", target: "/profile/data" },
  { icon: <Bell size={20} />, labelKey: "screens.profile.notifications", target: "/profile/notifications" },
];

export function ProfileMenuButton() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setVisible(false);
      }
    }

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible]);

  function handleSelect(target: string) {
    setVisible(false);
    navigate(target);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setVisible(!visible)}
        className="p-2 text-text-muted hover:text-text transition-colors"
        aria-label="Menu"
      >
        <MoreVertical size={24} />
      </button>

      {visible && (
        <div className="absolute right-0 top-12 bg-surface rounded-lg shadow-lg border border-border overflow-hidden min-w-[200px] z-50">
          {MENU_ITEMS.map((item, index) => (
            <button
              key={item.target}
              onClick={() => handleSelect(item.target)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
              style={index < MENU_ITEMS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: "var(--color-border)" } : undefined}
            >
              <span className="text-primary">{item.icon}</span>
              <span className="text-text text-base">{t(item.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
