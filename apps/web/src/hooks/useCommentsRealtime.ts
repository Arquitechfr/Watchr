import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";

export function useCommentsRealtime(showId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubCreated = websocketService.on("comment:created", (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (d?.showId === showId) {
        queryClient.invalidateQueries({ queryKey: ["comments", "show", showId] });
        queryClient.invalidateQueries({ queryKey: ["comments", "count", showId] });
      }
    });
    const unsubUpdated = websocketService.on("comment:updated", (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (d?.showId === showId) {
        queryClient.invalidateQueries({ queryKey: ["comments", "show", showId] });
      }
    });
    const unsubDeleted = websocketService.on("comment:deleted", (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (d?.showId === showId) {
        queryClient.invalidateQueries({ queryKey: ["comments", "show", showId] });
        queryClient.invalidateQueries({ queryKey: ["comments", "count", showId] });
      }
    });
    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [queryClient, showId]);
}
