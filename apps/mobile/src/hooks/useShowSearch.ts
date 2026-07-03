import { useQuery } from "@tanstack/react-query";
import { searchShows } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useShowSearch(query: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["shows", "search", query],
    queryFn: () => searchShows(query),
    enabled: isHydrated && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
