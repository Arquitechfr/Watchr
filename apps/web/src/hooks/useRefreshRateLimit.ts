import { useCallback, useRef } from "react";

export function useRefreshRateLimit(minIntervalMs: number = 3000) {
  const lastRefreshRef = useRef(0);

  return useCallback(
    (refreshFn: () => void) => {
      const now = Date.now();
      if (now - lastRefreshRef.current >= minIntervalMs) {
        lastRefreshRef.current = now;
        refreshFn();
      }
    },
    [minIntervalMs],
  );
}
