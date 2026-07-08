import { useQuery } from "@tanstack/react-query";
import { getTrackingEntry } from "../services/tracking.service";

export function useTrackingEntry(showId: string) {
  return useQuery({
    queryKey: ["tracking", "entry", showId],
    queryFn: () => getTrackingEntry(showId),
    enabled: !!showId,
    staleTime: 30_000,
  });
}
