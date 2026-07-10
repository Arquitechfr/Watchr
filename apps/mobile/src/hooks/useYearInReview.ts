import { useQuery } from "@tanstack/react-query";
import { getYearInReview } from "../services/stats.service";
import { useAuthStore } from "../store/authStore";

export function useYearInReview(year?: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["year-in-review", year],
    queryFn: () => getYearInReview(year),
    enabled: isHydrated,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
