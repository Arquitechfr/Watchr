import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";

export function useUpcomingRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = websocketService.on("upcoming:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
    });
    return unsub;
  }, [queryClient]);
}
