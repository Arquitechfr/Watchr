import { useQuery } from "@tanstack/react-query";
import { getMoodRecommendations, type MoodRecommendationResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useMoodRecommendations(mood: string | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery<MoodRecommendationResult>({
    queryKey: ["mood-recommendations", mood],
    queryFn: () => getMoodRecommendations(mood!),
    enabled: isHydrated && Boolean(mood),
    staleTime: 30 * 60 * 1000,
  });
}
