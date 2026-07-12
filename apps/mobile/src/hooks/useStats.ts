import { useQuery } from "@tanstack/react-query";
import { getUserStats, type UserStats } from "../services/stats.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useUserStats() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);

  return useQuery<UserStats>({
    queryKey: ["user-stats", locale],
    queryFn: getUserStats,
    enabled: isHydrated,
  });
}
