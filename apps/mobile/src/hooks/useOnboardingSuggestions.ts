import { useQuery } from "@tanstack/react-query";
import { getOnboardingSuggestions, type OnboardingSuggestionResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useOnboardingSuggestions(preferences: {
  genres?: string[];
  mood?: string;
  type?: "tv" | "movie" | "both";
} | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery<OnboardingSuggestionResult>({
    queryKey: ["onboarding-suggestions", preferences],
    queryFn: () => getOnboardingSuggestions(preferences!),
    enabled: isHydrated && preferences !== null,
    staleTime: 60 * 60 * 1000,
  });
}
