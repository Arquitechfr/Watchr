import { useQuery } from "@tanstack/react-query";
import { getYearInReview } from "../services/stats.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { useRemoteConfig } from "./useRemoteConfig";

export function useYearInReview(year?: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  const config = useRemoteConfig();
  return useQuery({
    queryKey: ["year-in-review", year, locale],
    queryFn: () => getYearInReview(year),
    enabled: isHydrated && config.ai_year_in_review_enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
