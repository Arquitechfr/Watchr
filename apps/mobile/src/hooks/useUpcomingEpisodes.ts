import { useQuery } from "@tanstack/react-query";
import { getUpcomingEpisodes } from "../services/upcoming.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useUpcomingEpisodes() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: ["upcoming", locale],
    queryFn: getUpcomingEpisodes,
    staleTime: 5 * 60 * 1000,
    enabled: isHydrated,
  });
}
