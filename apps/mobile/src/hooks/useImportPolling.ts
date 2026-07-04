import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getImportJobStatus } from "../services/import.service";
import { useAuthStore } from "../store/authStore";
import { websocketService } from "../services/websocket.service";
import { log } from "../utils/logger";

export function useImportPolling(jobId: string | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["import", jobId],
    queryFn: () => {
      if (!jobId) throw new Error("No jobId");
      return getImportJobStatus(jobId);
    },
    enabled: isHydrated && Boolean(jobId),
    refetchInterval: false,
  });

  useEffect(() => {
    if (!isHydrated || !jobId) return;

    const unsub = websocketService.on("import:progress", (payload: unknown) => {
      const event = payload as { jobId: string; status: string };
      if (event.jobId !== jobId) return;
      log("useImportPolling", "ws event", { jobId, status: event.status });
      queryClient.invalidateQueries({ queryKey: ["import", jobId] });
    });

    return unsub;
  }, [isHydrated, jobId, queryClient]);

  return query;
}
