import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";

export function useShowDetailsRealtime(showId: string, tmdbId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = websocketService.on("show:updated", (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (d?.tmdbId === tmdbId || d?.showId === showId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
        queryClient.invalidateQueries({ queryKey: ["tracking", "entry", showId] });
      }
    });
    return unsub;
  }, [queryClient, showId, tmdbId]);
}
