import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";
import { log } from "../utils/logger";

const COMMENTS_QUERY_KEY = "comments";

export function useCommentsRealtime(showId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showId) return;

    websocketService.emit("subscribe:show", showId);
    log("useCommentsRealtime", "subscribed", { showId });

    const handlers: Array<() => void> = [];

    const events = [
      "comment:created",
      "comment:updated",
      "comment:deleted",
      "comment:liked",
      "comment:reaction",
    ];

    for (const event of events) {
      const unsub = websocketService.on(event, (payload: unknown) => {
        const data = payload as { showId: string };
        if (data.showId !== showId) return;
        log("useCommentsRealtime", "event", { event, showId });
        queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, showId] });
        queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, "count", showId] });
        queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, "replies"] });
        queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, "single"] });
      });
      handlers.push(unsub);
    }

    return () => {
      websocketService.emit("unsubscribe:show", showId);
      log("useCommentsRealtime", "unsubscribed", { showId });
      handlers.forEach((fn) => fn());
    };
  }, [showId, queryClient]);
}
