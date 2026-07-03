import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { WatchEntry } from "../services/tracking.service";

async function getTrackingEntry(showId: string): Promise<WatchEntry | null> {
  const response = await api.get<WatchEntry>(`/tracking/${showId}`);
  return response.data;
}

export function useTrackingEntry(showId: string) {
  return useQuery({
    queryKey: ["tracking", "entry", showId],
    queryFn: () => getTrackingEntry(showId),
    enabled: Boolean(showId),
  });
}
