import { useEffect } from "react";
import { websocketService } from "../services/websocket.service";
import { useNotificationStore } from "../store/notificationStore";

export function useRealtimeNotifications() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    const unsub = websocketService.on("notification", (data: unknown) => {
      const d = data as Record<string, unknown>;
      addNotification({
        type: (d?.type as string) ?? "general",
        title: (d?.title as string) ?? "",
        body: (d?.body as string) ?? "",
        data: d,
        createdAt: new Date().toISOString(),
      });
    });
    return unsub;
  }, [addNotification]);
}
