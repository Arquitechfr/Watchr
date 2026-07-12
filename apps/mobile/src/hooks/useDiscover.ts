import { useQuery } from "@tanstack/react-query";
import { getDiscoverSections, DiscoverResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useDiscoverSections() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery<DiscoverResult>({
    queryKey: ["shows", "discover", locale],
    queryFn: () => getDiscoverSections(),
    enabled: isHydrated,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
