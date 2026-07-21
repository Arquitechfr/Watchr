import { useEffect, useRef } from "react";
import { websocketService } from "../services/websocket.service";
import { useNotificationStore, InAppNotification } from "../store/notificationStore";
import { log } from "../utils/logger";

export function useRealtimeNotifications(): void {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) {
      useNotificationStore.getState().hydrate();
      hydratedRef.current = true;
    }

    const unsub = websocketService.on("notification:new", (payload: unknown) => {
      const data = payload as { userId?: string; notification: Omit<InAppNotification, "id" | "read"> };
      log("useRealtimeNotifications", "received", { type: data.notification.type });
      websocketService.updateLastEventTimestamp(Date.now());
      addNotification(data.notification);
    });

    return unsub;
  }, [addNotification]);
}
