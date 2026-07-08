import { useQuery } from "@tanstack/react-query";
import { getUserStats, type UserStats } from "../services/stats.service";

export function useStats() {
  return useQuery<UserStats>({
    queryKey: ["auth", "me", "stats"],
    queryFn: () => getUserStats(),
    staleTime: 60_000,
  });
}
