import { useQuery } from "@tanstack/react-query";
import { getDiscoverSections, DiscoverResult } from "../services/shows.service";
import { useAuthStore } from "../store/authStore";

export function useDiscoverSections() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery<DiscoverResult>({
    queryKey: ["shows", "discover"],
    queryFn: () => getDiscoverSections(),
    enabled: isHydrated,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
