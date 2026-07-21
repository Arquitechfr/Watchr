import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";
import { log } from "../utils/logger";

export function useShowDetailsRealtime(showId: string | null, tmdbId?: number): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showId) return;

    const unsub = websocketService.on("show:updated", (payload: unknown) => {
      const data = payload as { showId: string };
      if (data.showId !== showId) return;
      log("useShowDetailsRealtime", "event", { showId, tmdbId });
      websocketService.updateLastEventTimestamp(Date.now());
      if (tmdbId) {
        queryClient.invalidateQueries({ queryKey: ["shows", "details", tmdbId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["shows", "details"] });
      }
    });

    return unsub;
  }, [showId, tmdbId, queryClient]);
}
