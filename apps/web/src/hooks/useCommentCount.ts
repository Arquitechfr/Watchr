import { useQuery } from "@tanstack/react-query";
import { getCommentCount } from "../services/comments.service";

export function useCommentCount(showId: string, episodeRef?: { season: number; episode: number }) {
  return useQuery({
    queryKey: ["comments", "count", showId, episodeRef],
    queryFn: () => getCommentCount(showId, episodeRef),
    enabled: !!showId,
    staleTime: 30_000,
  });
}
