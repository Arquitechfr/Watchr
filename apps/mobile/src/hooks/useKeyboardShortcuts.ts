import { useEffect } from "react";
import { Platform } from "react-native";

type TabName = "Series" | "Movies" | "Search" | "News" | "Profile";

interface KeyboardShortcutsOptions {
  onTabSelect: (tab: TabName) => void;
  onSearchFocus?: () => void;
  onGoBack?: () => void;
  enabled?: boolean;
}

const TAB_KEYS: Record<string, TabName> = {
  "1": "Series",
  "2": "Movies",
  "3": "Search",
  "4": "News",
  "5": "Profile",
};

export function useKeyboardShortcuts({
  onTabSelect,
  onSearchFocus,
  onGoBack,
  enabled = true,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (Platform.OS !== "web" || !enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        if (e.key === "Escape" && target.blur) {
          target.blur();
        }
        return;
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (onSearchFocus) {
          onSearchFocus();
        } else {
          onTabSelect("Search");
        }
        return;
      }

      if (e.key === "Escape" && onGoBack) {
        onGoBack();
        return;
      }

      if (TAB_KEYS[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onTabSelect(TAB_KEYS[e.key]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTabSelect, onSearchFocus, onGoBack, enabled]);
}
