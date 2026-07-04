import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from "../services/auth.service";
import { log } from "../utils/logger";

const PREFS_QUERY_KEY = ["notification-preferences"];

export function useNotificationPreferences() {
  return useQuery({
    queryKey: PREFS_QUERY_KEY,
    queryFn: async () => {
      const result = await getNotificationPreferences();
      return result.notificationPreferences;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      const result = await updateNotificationPreferences(prefs);
      return result.notificationPreferences;
    },
    onMutate: (prefs) => {
      log("useNotificationPreferences", "update mutate", { prefs });
    },
    onSuccess: (data) => {
      log("useNotificationPreferences", "update success", { data });
      queryClient.setQueryData(PREFS_QUERY_KEY, data);
    },
    onError: (err) => {
      log("useNotificationPreferences", "update error", { err });
    },
  });
}
