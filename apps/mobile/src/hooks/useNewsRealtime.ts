import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";
import { log } from "../utils/logger";

export function useNewsRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = websocketService.on("news:new", () => {
      log("useNewsRealtime", "event");
      queryClient.invalidateQueries({ queryKey: ["news"] });
    });

    return unsub;
  }, [queryClient]);
}
