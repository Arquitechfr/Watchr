import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";

export function useTrackingRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = websocketService.on("tracking:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["tracking"] });
    });
    return unsub;
  }, [queryClient]);
}
