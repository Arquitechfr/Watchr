import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useThemeStore, type ThemePreference } from "../store/themeStore";
import { getColors, type ColorPalette, type ThemeMode } from "./colors";

interface ThemeContextValue {
  mode: ThemeMode;
  preference: ThemePreference;
  colors: ColorPalette;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemMode(): ThemeMode {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useThemeStore((s) => s.themePreference);
  const setPreference = useThemeStore((s) => s.setThemePreference);

  const mode: ThemeMode = useMemo(() => {
    if (preference === "system") {
      return getSystemMode();
    }
    return preference;
  }, [preference]);

  const colors = useMemo(() => getColors(mode), [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
  }, [mode]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(getSystemMode());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, preference, colors, setPreference }),
    [mode, preference, colors, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
