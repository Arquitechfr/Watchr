import { useQuery } from "@tanstack/react-query";
import { getEnrichedTags } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useEnrichedTags(tmdbId: number, type?: "tv" | "movie") {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: ["shows", "enriched-tags", tmdbId, type, locale],
    queryFn: () => getEnrichedTags(tmdbId, type),
    enabled: isHydrated && Number.isFinite(tmdbId) && tmdbId > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
