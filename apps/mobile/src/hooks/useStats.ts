import { useQuery } from "@tanstack/react-query";
import { getUserStats, type UserStats } from "../services/stats.service";
import { useAuthStore } from "../store/authStore";

export function useUserStats() {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useQuery<UserStats>({
    queryKey: ["user-stats"],
    queryFn: getUserStats,
    enabled: isHydrated,
  });
}
