import { useEffect, useState, useCallback } from "react";
import { getImportJobStatus, type ImportJob } from "../services/import.service";
import { websocketService } from "../services/websocket.service";

export function useImportJob(jobId: string | null) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!jobId) return;
    try {
      const data = await getImportJobStatus(jobId);
      setJob(data);
    } catch {
      // ignore — will retry on next ws event
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));

    const unsub = websocketService.on("import:progress", (payload: unknown) => {
      const event = payload as { jobId: string; status: string };
      if (event.jobId !== jobId) return;
      refetch();
    });

    return unsub;
  }, [jobId, refetch]);

  return { job, isLoading, refetch };
}
