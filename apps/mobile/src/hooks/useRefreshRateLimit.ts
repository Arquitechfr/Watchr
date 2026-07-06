import { useCallback, useState } from "react";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";

interface UseRefreshRateLimitOptions {
  maxCount?: number;
  windowMs?: number;
}

export function useRefreshRateLimit({ maxCount = 2, windowMs = 60_000 }: UseRefreshRateLimitOptions = {}) {
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();

  const throttledRefresh = useCallback(
    (refetch: () => void) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      const recentTimestamps = timestamps.filter((ts) => ts > windowStart);

      if (recentTimestamps.length >= maxCount) {
        const oldest = recentTimestamps[0];
        const remainingSeconds = Math.ceil((oldest + windowMs - now) / 1000);
        showSnackbar(t("common.refreshRateLimited", { seconds: remainingSeconds }), "info");
        return;
      }

      setTimestamps([...recentTimestamps, now]);
      refetch();
    },
    [maxCount, windowMs, showSnackbar, t, timestamps],
  );

  return throttledRefresh;
}
