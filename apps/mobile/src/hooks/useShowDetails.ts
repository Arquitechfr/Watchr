import { useQuery } from "@tanstack/react-query";
import { getShowDetails } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useShowDetails(tmdbId: number) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  const validTmdbId = Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : 0;
  return useQuery({
    queryKey: ["shows", "details", validTmdbId, locale],
    queryFn: () => getShowDetails(validTmdbId),
    enabled: isHydrated && validTmdbId > 0,
    staleTime: 10 * 60 * 1000,
  });
}
