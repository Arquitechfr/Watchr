import { useQuery } from "@tanstack/react-query";
import { listCommentsForShow, type ListCommentsQuery } from "../services/comments.service";

export function useCommentsForShow(showId: string, query?: ListCommentsQuery) {
  return useQuery({
    queryKey: ["comments", "show", showId, query],
    queryFn: () => listCommentsForShow(showId, query),
    enabled: !!showId,
    staleTime: 15_000,
  });
}
