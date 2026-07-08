import { useQuery } from "@tanstack/react-query";
import { listRatingsForShow } from "../services/ratings.service";

export function useRatingsForShow(showId: string) {
  return useQuery({
    queryKey: ["ratings", showId],
    queryFn: () => listRatingsForShow(showId),
    enabled: !!showId,
    staleTime: 30_000,
  });
}
