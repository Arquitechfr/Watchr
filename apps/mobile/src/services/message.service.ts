import { api } from "./api";
import { log } from "../utils/logger";

export interface MessageAttachment {
  type: "show" | "image";
  showTmdbId?: number;
  showTitle?: string;
  showPosterPath?: string;
  imageUrl?: string;
}

export interface ConversationItem {
  id: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isDeleted: boolean;
  } | null;
  unreadCount: number;
  archived: boolean;
  muted: boolean;
  deleted: boolean;
  lastMessageAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: MessageAttachment[];
  translatedContent?: string;
  isTranslated?: boolean;
  originalLanguage?: string;
  isRead: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  isSystemMessage: boolean;
  reactions: Array<{ userId: string; emoji: string }>;
  createdAt: string;
}

export interface ConversationListResponse {
  conversations: ConversationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MessageListResponse {
  messages: MessageItem[];
  hasMore: boolean;
  page: number;
  limit: number;
}

export async function createConversation(targetUserId: string): Promise<{ id: string; isNew: boolean }> {
  log("MessageService", "createConversation", { targetUserId });
  const res = await api.post<{ id: string; isNew: boolean }>(`/messages/conversations/${targetUserId}`);
  return res.data;
}

export async function getConversations(page = 1, limit = 20, archived = false): Promise<ConversationListResponse> {
  log("MessageService", "getConversations", { page, limit, archived });
  const res = await api.get<ConversationListResponse>("/messages/conversations", {
    params: { page, limit, archived: String(archived) },
  });
  return res.data;
}

export async function getMessages(
  conversationId: string,
  page = 1,
  limit = 50,
  before?: string,
): Promise<MessageListResponse> {
  log("MessageService", "getMessages", { conversationId, page, limit });
  const res = await api.get<MessageListResponse>(`/messages/conversations/${conversationId}/messages`, {
    params: { page, limit, before },
  });
  return res.data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: MessageAttachment[],
): Promise<MessageItem> {
  log("MessageService", "sendMessage", { conversationId, contentLength: content.length });
  const res = await api.post<MessageItem>(`/messages/conversations/${conversationId}/messages`, {
    content,
    attachments: attachments ?? [],
  });
  return res.data;
}

export async function editMessage(messageId: string, content: string): Promise<MessageItem> {
  log("MessageService", "editMessage", { messageId });
  const res = await api.patch<MessageItem>(`/messages/${messageId}`, { content });
  return res.data;
}

export async function deleteMessage(messageId: string): Promise<{ deleted: boolean }> {
  log("MessageService", "deleteMessage", { messageId });
  const res = await api.delete<{ deleted: boolean }>(`/messages/${messageId}`);
  return res.data;
}

export async function addReaction(messageId: string, emoji: string): Promise<{ reactions: Array<{ userId: string; emoji: string }> }> {
  log("MessageService", "addReaction", { messageId, emoji });
  const res = await api.post(`/messages/${messageId}/reactions`, { emoji });
  return res.data;
}

export async function removeReaction(messageId: string, emoji: string): Promise<{ reactions: Array<{ userId: string; emoji: string }> }> {
  log("MessageService", "removeReaction", { messageId, emoji });
  const res = await api.delete(`/messages/${messageId}/reactions`, { data: { emoji } });
  return res.data;
}

export async function reportMessage(messageId: string, reason: string): Promise<{ id: string; status: string }> {
  log("MessageService", "reportMessage", { messageId, reason });
  const res = await api.post(`/messages/${messageId}/report`, { reason });
  return res.data;
}

export async function markAsRead(conversationId: string, messageIds?: string[]): Promise<{ marked: number }> {
  log("MessageService", "markAsRead", { conversationId });
  const res = await api.post(`/messages/conversations/${conversationId}/read`, { messageIds });
  return res.data;
}

export async function archiveConversation(conversationId: string, archived: boolean): Promise<void> {
  log("MessageService", "archiveConversation", { conversationId, archived });
  await api.patch(`/messages/conversations/${conversationId}/archive`, { archived });
}

export async function muteConversation(conversationId: string, muted: boolean): Promise<void> {
  log("MessageService", "muteConversation", { conversationId, muted });
  await api.patch(`/messages/conversations/${conversationId}/mute`, { muted });
}

export async function deleteConversation(conversationId: string): Promise<{ deleted: boolean }> {
  log("MessageService", "deleteConversation", { conversationId });
  const res = await api.delete<{ deleted: boolean }>(`/messages/conversations/${conversationId}`);
  return res.data;
}

export async function restoreConversation(conversationId: string): Promise<{ restored: boolean }> {
  log("MessageService", "restoreConversation", { conversationId });
  const res = await api.patch<{ restored: boolean }>(`/messages/conversations/${conversationId}/restore`);
  return res.data;
}

export async function getUnreadCount(): Promise<{ unreadCount: number }> {
  const res = await api.get<{ unreadCount: number }>("/messages/unread-count");
  return res.data;
}

export async function blockUser(userId: string): Promise<{ blocked: boolean }> {
  log("MessageService", "blockUser", { userId });
  const res = await api.post(`/blocks/${userId}`);
  return res.data;
}

export async function unblockUser(userId: string): Promise<{ unblocked: boolean }> {
  log("MessageService", "unblockUser", { userId });
  const res = await api.delete(`/blocks/${userId}`);
  return res.data;
}

export async function getBlockedUsers(page = 1, limit = 20): Promise<{
  users: Array<{ id: string; username: string; avatarUrl?: string }>;
  total: number;
  page: number;
  limit: number;
}> {
  const res = await api.get("/blocks", { params: { page, limit } });
  return res.data;
}

export interface DmContact {
  id: string;
  username: string;
  avatarUrl?: string;
  isMutual: boolean;
}

export async function getDmContacts(page = 1, limit = 20): Promise<{
  contacts: DmContact[];
  total: number;
  page: number;
  limit: number;
}> {
  const res = await api.get("/messages/contacts", { params: { page, limit } });
  return res.data;
}
