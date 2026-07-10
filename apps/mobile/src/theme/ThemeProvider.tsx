import { createContext, useContext, useMemo, useEffect, type ReactNode } from "react";
import { useColorScheme, Platform } from "react-native";
import { View } from "react-native";
import { useThemeStore, type ThemePreference } from "../store/themeStore";
import { getColors, type ColorPalette, type ThemeMode } from "./colors";

interface ThemeContextValue {
  mode: ThemeMode;
  preference: ThemePreference;
  colors: ColorPalette;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useThemeStore((s) => s.themePreference);
  const setPreference = useThemeStore((s) => s.setThemePreference);
  const systemScheme = useColorScheme();

  const mode: ThemeMode = useMemo(() => {
    if (preference === "system") {
      return systemScheme === "light" ? "light" : "dark";
    }
    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(() => getColors(mode), [mode]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, preference, colors, setPreference }),
    [mode, preference, colors, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View className={mode === "dark" ? "dark" : "light"} style={{ flex: 1, backgroundColor: colors.background }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
