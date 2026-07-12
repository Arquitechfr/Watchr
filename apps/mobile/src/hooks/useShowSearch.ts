import { useQuery } from "@tanstack/react-query";
import { searchShows } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

export function useShowSearch(query: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const locale = useLocaleStore((state) => state.locale);
  return useQuery({
    queryKey: ["shows", "search", query, locale],
    queryFn: () => searchShows(query),
    enabled: isHydrated && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
