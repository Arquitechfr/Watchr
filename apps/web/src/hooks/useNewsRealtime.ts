import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";

export function useNewsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = websocketService.on("news:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    });
    return unsub;
  }, [queryClient]);
}
