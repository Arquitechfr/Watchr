import { useEffect, useRef } from "react";
import { websocketService } from "../services/websocket.service";
import { useNotificationStore, InAppNotification } from "../store/notificationStore";
import { useMessageStore } from "../store/messageStore";
import { log } from "../utils/logger";

export function useRealtimeNotifications(): void {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const activeConversationId = useMessageStore((s) => s.activeConversationId);
  const activeRef = useRef(activeConversationId);
  activeRef.current = activeConversationId;
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

      if (
        data.notification.type === "directMessage" &&
        activeRef.current &&
        activeRef.current === (data.notification.data as Record<string, unknown> | undefined)?.conversationId
      ) {
        return;
      }

      addNotification(data.notification);
    });

    return unsub;
  }, [addNotification]);
}
