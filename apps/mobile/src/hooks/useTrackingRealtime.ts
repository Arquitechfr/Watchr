import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";
import { log } from "../utils/logger";

export function useTrackingRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = websocketService.on("tracking:updated", (payload: unknown) => {
      const data = payload as { userId: string; showId: string };
      log("useTrackingRealtime", "event", { showId: data.showId });
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    });

    return unsub;
  }, [queryClient]);
}
