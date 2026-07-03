import { useCallback, useState } from "react";
import { useUIStore } from "../store/uiStore";

interface UseRefreshRateLimitOptions {
  maxCount?: number;
  windowMs?: number;
}

export function useRefreshRateLimit({ maxCount = 2, windowMs = 60_000 }: UseRefreshRateLimitOptions = {}) {
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const { showSnackbar } = useUIStore();

  const throttledRefresh = useCallback(
    (refetch: () => void) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      const recentTimestamps = timestamps.filter((ts) => ts > windowStart);

      if (recentTimestamps.length >= maxCount) {
        const oldest = recentTimestamps[0];
        const remainingSeconds = Math.ceil((oldest + windowMs - now) / 1000);
        showSnackbar(`Tu pourras rafraîchir dans ${remainingSeconds} s`, "info");
        return;
      }

      setTimestamps([...recentTimestamps, now]);
      refetch();
    },
    [maxCount, windowMs, showSnackbar, timestamps],
  );

  return throttledRefresh;
}
