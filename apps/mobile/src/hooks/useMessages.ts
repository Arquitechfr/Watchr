import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
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
  type MessageItem,
  type MessageAttachment,
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
    onMutate: async ({ content }) => {
      await queryClient.cancelQueries({ queryKey: [MESSAGES_KEY, conversationId] });

      const prevData = queryClient.getQueriesData<{ pages: { messages: MessageItem[] }[] }>({
        queryKey: [MESSAGES_KEY, conversationId],
      });

      const optimisticMessage: MessageItem = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: useAuthStore.getState().userId ?? "",
        content,
        attachments: [],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useAddReaction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      addReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, conversationId] });
    },
  });
}

export function useRemoveReaction(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      removeReaction(messageId, emoji),
    onSuccess: () => {
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
    onSuccess: () => {
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
