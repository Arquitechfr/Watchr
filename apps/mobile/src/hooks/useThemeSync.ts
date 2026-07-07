import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { useThemeStore, type ThemePreference } from "../store/themeStore";
import { log } from "../utils/logger";

export function computeThemeSyncUpdate(
  serverPref: ThemePreference | undefined,
  localPref: ThemePreference,
): ThemePreference | null {
  if (!serverPref) return null;
  if (serverPref === localPref) return null;
  return serverPref;
}

export function useThemeSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setThemePreference = useThemeStore((s) => s.setThemePreference);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!me?.themePreference) return;
    const localPref = useThemeStore.getState().themePreference;
    const update = computeThemeSyncUpdate(me.themePreference, localPref);
    if (update) {
      log("ThemeSync", "syncing theme from server", { themePreference: update });
      setThemePreference(update);
    }
  }, [me?.themePreference, setThemePreference]);
}
