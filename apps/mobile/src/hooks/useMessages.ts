import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import {
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  reportMessage,
  markAsRead,
  archiveConversation,
  muteConversation,
  createConversation,
  getUnreadCount,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getDmContacts,
  type MessageItem,
  type MessageAttachment,
  type ConversationItem,
} from "../services/message.service";

const CONVERSATIONS_KEY = "conversations";
const MESSAGES_KEY = "messages";
const UNREAD_KEY = "unread-count";

export function useConversations(archived = false) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  return useInfiniteQuery({
    queryKey: [CONVERSATIONS_KEY, { archived }],
    queryFn: ({ pageParam = 1 }) => getConversations(pageParam, 20, archived),
    initialPageParam: 1,
    enabled: isHydrated,
    staleTime: 30 * 1000,
    getNextPageParam: (lastPage) => {
      const { page, total, limit } = lastPage;
      return page * limit < total ? page + 1 : undefined;
    },
  });
}

export function useMessages(conversationId: string | null) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  return useInfiniteQuery({
    queryKey: [MESSAGES_KEY, conversationId],
    queryFn: ({ pageParam = 1 }) => getMessages(conversationId!, pageParam, 50),
    initialPageParam: 1,
    enabled: isHydrated && !!conversationId,
    staleTime: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

export function useUnreadCount() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  return useQuery({
    queryKey: [UNREAD_KEY],
    queryFn: () => getUnreadCount(),
    enabled: isHydrated,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => createConversation(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, attachments }: { content: string; attachments?: MessageAttachment[] }) =>
      sendMessage(conversationId, content, attachments),
    onMutate: async ({ content, attachments }) => {
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, conversationId] });

      const prevData = queryClient.getQueriesData<{ pages: { messages: MessageItem[] }[] }>({
        queryKey: [MESSAGES_KEY, conversationId],
      });

      const optimisticMessage: MessageItem = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: useAuthStore.getState().userId ?? "",
        content,
        attachments: attachments ?? [],
        isRead: true,
        editedAt: null,
        isDeleted: false,
        isSystemMessage: false,
        reactions: [],
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueriesData<{ pages: { messages: MessageItem[] }[] }>(
        { queryKey: [MESSAGES_KEY, conversationId] },
        (old: { pages: { messages: MessageItem[] }[] } | undefined) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((page: { messages: MessageItem[] }, i: number) =>
              i === 0 ? { ...page, messages: [optimisticMessage, ...page.messages] } : page,
            ),
          };
        },
      );

      return { prevData };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevData) {
        context.prevData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useEditMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      editMessage(messageId, content),
    onMutate: async ({ messageId, content }) => {
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      const prevData = queryClient.getQueriesData<{ pages: { messages: MessageItem[] }[] }>({
        queryKey: [MESSAGES_KEY, conversationId],
      });
      queryClient.setQueriesData<{ pages: { messages: MessageItem[] }[] }>(
        { queryKey: [MESSAGES_KEY, conversationId] },
        (old: { pages: { messages: MessageItem[] }[] } | undefined) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((page: { messages: MessageItem[] }) => ({
              ...page,
              messages: page.messages.map((msg: MessageItem) =>
                msg.id === messageId
                  ? { ...msg, content, editedAt: new Date().toISOString() }
                  : msg,
              ),
            })),
          };
        },
      );
      return { prevData };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevData) {
        context.prevData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      const prevData = queryClient.getQueriesData<{ pages: { messages: MessageItem[] }[] }>({
        queryKey: [MESSAGES_KEY, conversationId],
      });
      queryClient.setQueriesData<{ pages: { messages: MessageItem[] }[] }>(
        { queryKey: [MESSAGES_KEY, conversationId] },
        (old: { pages: { messages: MessageItem[] }[] } | undefined) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((page: { messages: MessageItem[] }) => ({
              ...page,
              messages: page.messages.map((msg: MessageItem) =>
                msg.id === messageId
                  ? { ...msg, isDeleted: true, content: "" }
                  : msg,
              ),
            })),
          };
        },
      );
      return { prevData };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevData) {
        context.prevData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
  });
}

export function useAddReaction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      addReaction(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      const prevData = queryClient.getQueriesData<{ pages: { messages: MessageItem[] }[] }>({
        queryKey: [MESSAGES_KEY, conversationId],
      });
      const currentUserId = useAuthStore.getState().userId ?? "";
      queryClient.setQueriesData<{ pages: { messages: MessageItem[] }[] }>(
        { queryKey: [MESSAGES_KEY, conversationId] },
        (old: { pages: { messages: MessageItem[] }[] } | undefined) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((page: { messages: MessageItem[] }) => ({
              ...page,
              messages: page.messages.map((msg: MessageItem) => {
                if (msg.id !== messageId) return msg;
                const hasReaction = msg.reactions.some(
                  (r) => r.userId === currentUserId && r.emoji === emoji,
                );
                if (hasReaction) return msg;
                return {
                  ...msg,
                  reactions: [...msg.reactions, { userId: currentUserId, emoji }],
                };
              }),
            })),
          };
        },
      );
      return { prevData };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevData) {
        context.prevData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useRemoveReaction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      removeReaction(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, conversationId] });
      const prevData = queryClient.getQueriesData<{ pages: { messages: MessageItem[] }[] }>({
        queryKey: [MESSAGES_KEY, conversationId],
      });
      const currentUserId = useAuthStore.getState().userId ?? "";
      queryClient.setQueriesData<{ pages: { messages: MessageItem[] }[] }>(
        { queryKey: [MESSAGES_KEY, conversationId] },
        (old: { pages: { messages: MessageItem[] }[] } | undefined) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((page: { messages: MessageItem[] }) => ({
              ...page,
              messages: page.messages.map((msg: MessageItem) => {
                if (msg.id !== messageId) return msg;
                return {
                  ...msg,
                  reactions: msg.reactions.filter(
                    (r) => !(r.userId === currentUserId && r.emoji === emoji),
                  ),
                };
              }),
            })),
          };
        },
      );
      return { prevData };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevData) {
        context.prevData.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useReportMessage() {
  return useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: string }) =>
      reportMessage(messageId, reason),
  });
}

export function useMarkAsRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAsRead(conversationId),
    onMutate: async () => {
      useNotificationStore.getState().markConversationAsRead(conversationId);

      const prevConversations = queryClient.getQueriesData<{ pages: { conversations: ConversationItem[] }[] }>({
        queryKey: [CONVERSATIONS_KEY],
      });
      const prevUnread = queryClient.getQueryData<{ unreadCount: number }>([UNREAD_KEY]);

      queryClient.setQueriesData<{ pages: { conversations: ConversationItem[] }[] }>(
        { queryKey: [CONVERSATIONS_KEY] },
        (old: { pages: { conversations: ConversationItem[] }[] } | undefined) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((page: { conversations: ConversationItem[] }) => ({
              ...page,
              conversations: page.conversations.map((conv: ConversationItem) =>
                conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
              ),
            })),
          };
        },
      );

      if (prevUnread) {
        let convUnreadCount = 0;
        const convData = queryClient.getQueriesData<{ pages: { conversations: ConversationItem[] }[] }>({
          queryKey: [CONVERSATIONS_KEY],
        });
        for (const [, pageData] of convData) {
          if (!pageData?.pages) continue;
          for (const page of pageData.pages) {
            const conv = page.conversations.find((c) => c.id === conversationId);
            if (conv) {
              convUnreadCount = conv.unreadCount;
              break;
            }
          }
          if (convUnreadCount > 0) break;
        }
        queryClient.setQueryData<{ unreadCount: number }>([UNREAD_KEY], {
          unreadCount: Math.max(0, prevUnread.unreadCount - convUnreadCount),
        });
      }

      return { prevConversations, prevUnread };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevConversations) {
        context.prevConversations.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.prevUnread) {
        queryClient.setQueryData([UNREAD_KEY], context.prevUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_KEY] });
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, archived }: { conversationId: string; archived: boolean }) =>
      archiveConversation(conversationId, archived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
    },
  });
}

export function useMuteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, muted }: { conversationId: string; muted: boolean }) =>
      muteConversation(conversationId, muted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    },
  });
}

export function useBlockedUsers(page = 1, limit = 20) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  return useQuery({
    queryKey: ["blocked-users", page],
    queryFn: () => getBlockedUsers(page, limit),
    enabled: isHydrated,
    staleTime: 60 * 1000,
  });
}

const DM_CONTACTS_KEY = "dm-contacts";

export function useDmContacts() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  return useInfiniteQuery({
    queryKey: [DM_CONTACTS_KEY],
    queryFn: ({ pageParam = 1 }) => getDmContacts(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.contacts.length >= 20 ? lastPage.page + 1 : undefined,
    enabled: isHydrated,
    staleTime: 60 * 1000,
  });
}
