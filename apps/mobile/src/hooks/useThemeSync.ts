import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { log } from "../utils/logger";

export function useThemeSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setThemePreference = useThemeStore((s) => s.setThemePreference);
  const currentPref = useThemeStore((s) => s.themePreference);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (me?.themePreference && me.themePreference !== currentPref) {
      log("ThemeSync", "syncing theme from server", { themePreference: me.themePreference });
      setThemePreference(me.themePreference);
    }
  }, [me?.themePreference, currentPref, setThemePreference]);
}
