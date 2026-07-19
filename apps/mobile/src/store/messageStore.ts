import { create } from "zustand";
import type { MessageItem } from "../services/message.service";

interface MessageState {
  activeConversationId: string | null;
  typingUsers: Map<string, boolean>;
  onlineUsers: Map<string, boolean>;
  setActiveConversation: (id: string | null) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, isOnline: boolean) => void;
  reset: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  activeConversationId: null,
  typingUsers: new Map(),
  onlineUsers: new Map(),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const key = `${conversationId}:${userId}`;
      const newMap = new Map(state.typingUsers);
      if (isTyping) {
        newMap.set(key, true);
      } else {
        newMap.delete(key);
      }
      return { typingUsers: newMap };
    }),

  setOnline: (userId, isOnline) =>
    set((state) => {
      const newMap = new Map(state.onlineUsers);
      if (isOnline) {
        newMap.set(userId, true);
      } else {
        newMap.delete(userId);
      }
      return { onlineUsers: newMap };
    }),

  reset: () =>
    set({
      activeConversationId: null,
      typingUsers: new Map(),
      onlineUsers: new Map(),
    }),
}));

export function isUserTypingIn(conversationId: string, userId: string, state: MessageState): boolean {
  return state.typingUsers.has(`${conversationId}:${userId}`);
}

export function isUserOnline(userId: string, state: MessageState): boolean {
  return state.onlineUsers.has(userId);
}

export type { MessageItem };
