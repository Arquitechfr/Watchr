import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";
import { log } from "../utils/logger";

export function useUpcomingRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = websocketService.on("upcoming:updated", () => {
      log("useUpcomingRealtime", "event");
      websocketService.updateLastEventTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
    });

    return unsub;
  }, [queryClient]);
}
