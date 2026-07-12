import { useQuery } from "@tanstack/react-query";
import { getMoodRecommendations, type MoodRecommendationResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useMoodRecommendations(mood: string | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery<MoodRecommendationResult>({
    queryKey: ["mood-recommendations", mood, locale],
    queryFn: () => getMoodRecommendations(mood!),
    enabled: isHydrated && Boolean(mood),
    staleTime: 30 * 60 * 1000,
  });
}
