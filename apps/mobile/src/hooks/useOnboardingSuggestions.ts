import { useQuery } from "@tanstack/react-query";
import { getOnboardingSuggestions, type OnboardingSuggestionResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { useRemoteConfig } from "./useRemoteConfig";

export function useOnboardingSuggestions(preferences: {
  genres?: string[];
  mood?: string;
  type?: "tv" | "movie" | "both";
} | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  const config = useRemoteConfig();
  return useQuery<OnboardingSuggestionResult>({
    queryKey: ["onboarding-suggestions", preferences, locale],
    queryFn: () => getOnboardingSuggestions(preferences!),
    enabled: isHydrated && config.ai_onboarding_suggestions_enabled && preferences !== null,
    staleTime: 60 * 60 * 1000,
  });
}
