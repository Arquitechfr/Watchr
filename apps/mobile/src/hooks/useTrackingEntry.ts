import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { WatchEntry } from "../services/tracking.service";
import { useAuthStore } from "../store/authStore";

async function getTrackingEntry(showId: string): Promise<WatchEntry | null> {
  const response = await api.get<WatchEntry>(`/tracking/${showId}`);
  return response.data;
}

export function useTrackingEntry(showId: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["tracking", "entry", showId],
    queryFn: () => getTrackingEntry(showId),
    enabled: isHydrated && Boolean(showId),
    staleTime: 30_000,
  });
}
