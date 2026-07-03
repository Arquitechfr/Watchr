import { useQuery } from "@tanstack/react-query";
import { getUpcomingEpisodes } from "../services/upcoming.service";
import { useAuthStore } from "../store/authStore";

export function useUpcomingEpisodes() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["upcoming"],
    queryFn: getUpcomingEpisodes,
    staleTime: 5 * 60 * 1000,
    enabled: isHydrated,
  });
}
