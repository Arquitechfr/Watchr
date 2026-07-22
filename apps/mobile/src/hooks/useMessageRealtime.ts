import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "../services/websocket.service";
import { useMessageStore } from "../store/messageStore";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";

interface MessageNewPayload {
  recipientId: string;
  conversationId: string;
  message: {
    id: string;
    content: string;
    senderId: string;
    senderUsername?: string;
    createdAt: string;
  };
}

export function useMessageRealtime(): void {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const activeConversationId = useMessageStore((s) => s.activeConversationId);
  const activeRef = useRef(activeConversationId);
  activeRef.current = activeConversationId;

  useEffect(() => {
    const unsub = websocketService.on("message:new", (payload: unknown) => {
      const data = payload as MessageNewPayload;
      if (!data?.conversationId) return;

      log("useMessageRealtime", "message:new", { conversationId: data.conversationId });

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });

      if (activeRef.current !== data.conversationId) {
        const preview = data.message.content?.length > 50
          ? data.message.content.slice(0, 50) + "..."
          : data.message.content;
        showSnackbar(
          t("messages.newMessageSnackbar", { sender: data.message.senderUsername ?? "", preview }),
          "info",
        );
      }
    });

    return unsub;
  }, [queryClient, showSnackbar, t]);
}
