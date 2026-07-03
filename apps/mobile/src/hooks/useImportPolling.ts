import { useQuery } from "@tanstack/react-query";
import { getImportJobStatus } from "../services/import.service";
import { useAuthStore } from "../store/authStore";

const POLLING_INTERVAL = 2000;

export function useImportPolling(jobId: string | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: ["import", jobId],
    queryFn: () => {
      if (!jobId) throw new Error("No jobId");
      return getImportJobStatus(jobId);
    },
    enabled: isHydrated && Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "completed" || status === "failed") return false;
      return POLLING_INTERVAL;
    },
  });
}
