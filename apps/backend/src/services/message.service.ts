import { Types } from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { Message, type MessageAttachment, type MessageReaction } from "../models/message.model.js";
import { MessageReport, type MessageReportReason } from "../models/messageReport.model.js";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { logError } from "../lib/logger.js";
import { wsEvents } from "../lib/wsEvents.js";
import { translateMessageAsync } from "./messageTranslation.service.js";
import { isEitherBlocked } from "./userBlock.service.js";
import { MobileConfig } from "../models/MobileConfig.js";

async function getRemoteConfigValue(key: string): Promise<string | null> {
  const entry = await MobileConfig.findOne({ key }).lean();
  return entry?.value ?? null;
}

async function getMessageMaxLength(): Promise<number> {
  const val = await getRemoteConfigValue("message_max_length");
  const num = val ? parseInt(val, 10) : NaN;
  return isNaN(num) ? 2000 : num;
}

async function getAutoHideThreshold(): Promise<number> {
  const val = await getRemoteConfigValue("message_auto_hide_threshold");
  const num = val ? parseInt(val, 10) : NaN;
  return isNaN(num) ? 5 : num;
}

function getOtherParticipantId(conversation: { participantIds: Types.ObjectId[] }, userId: string): Types.ObjectId {
  return conversation.participantIds.find((id) => id.toString() !== userId) ?? conversation.participantIds[0];
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

interface LeanMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  attachments: MessageAttachment[];
  translations: Record<string, string> | null;
  originalLanguage?: string;
  readBy: Types.ObjectId[];
  editedAt: Date | null;
  isDeleted: boolean;
  isSystemMessage: boolean;
  reactions: MessageReaction[];
  createdAt: Date;
}

function buildMessageItem(msg: LeanMessage, userId: string, userLocale: string = "en"): MessageItem {
  const translations = msg.translations;

  return {
    id: msg._id.toString(),
    conversationId: msg.conversationId.toString(),
    senderId: msg.senderId.toString(),
    content: msg.isDeleted ? "" : msg.content,
    attachments: msg.attachments ?? [],
    translatedContent: translations?.[userLocale],
    isTranslated: !!translations && userLocale in translations && msg.originalLanguage !== userLocale,
    originalLanguage: msg.originalLanguage ?? undefined,
    isRead: msg.readBy.some((id: Types.ObjectId) => id.toString() === userId),
    editedAt: msg.editedAt ? msg.editedAt.toISOString() : null,
    isDeleted: msg.isDeleted,
    isSystemMessage: msg.isSystemMessage,
    reactions: (msg.reactions ?? []).map((r: MessageReaction) => ({
      userId: r.userId.toString(),
      emoji: r.emoji,
    })),
    createdAt: msg.createdAt.toISOString(),
  };
}

export async function createConversation(
  userId: string,
  targetUserId: string,
  bypassPrivacyCheck = false,
): Promise<{ id: string; isNew: boolean }> {
  if (userId === targetUserId) {
    throw new ApiError(400, "CANNOT_MESSAGE_SELF", "You cannot start a conversation with yourself");
  }

  const targetUser = await User.findById(targetUserId).select("_id username isBanned").lean();
  if (!targetUser) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  if (targetUser.isBanned) {
    throw new ApiError(403, "USER_BANNED", "This user has been banned");
  }

  const blocked = await isEitherBlocked(userId, targetUserId);
  if (blocked) {
    throw new ApiError(403, "BLOCKED", "You cannot start a conversation with this user");
  }

  if (!bypassPrivacyCheck) {
    const target = await User.findById(targetUserId).select("dmPrivacy").lean();
    if (target?.dmPrivacy === "friends_only") {
      const mutualFollow = await Follow.findOne({
        followerId: new Types.ObjectId(userId),
        followingId: new Types.ObjectId(targetUserId),
      })
        .select("_id")
        .lean();
      if (!mutualFollow) {
        throw new ApiError(403, "DM_NOT_ALLOWED", "This user only accepts messages from friends");
      }
    }
  }

  const sortedIds = [userId, targetUserId]
    .map((id) => new Types.ObjectId(id))
    .sort((a, b) => a.toString().localeCompare(b.toString()));

  const existing = await Conversation.findOne({ participantIds: { $all: sortedIds } }).lean();
  if (existing) {
    await Conversation.updateOne(
      { _id: existing._id },
      { $pull: { archivedBy: new Types.ObjectId(userId) } },
    );
    return { id: existing._id.toString(), isNew: false };
  }

  const conv = await Conversation.create({
    participantIds: sortedIds,
    lastMessageAt: new Date(),
  });

  return { id: conv._id.toString(), isNew: true };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  attachments: MessageAttachment[] = [],
  isSystemMessage = false,
): Promise<MessageItem> {
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  const isParticipant = conv.participantIds.some((id) => id.toString() === senderId);
  if (!isParticipant) {
    throw new ApiError(403, "NOT_PARTICIPANT", "You are not a participant in this conversation");
  }

  const maxLength = await getMessageMaxLength();
  if (content.length > maxLength) {
    throw new ApiError(400, "MESSAGE_TOO_LONG", `Message exceeds ${maxLength} characters`);
  }

  const recipientId = getOtherParticipantId(conv, senderId).toString();

  if (!isSystemMessage) {
    const blocked = await isEitherBlocked(senderId, recipientId);
    if (blocked) {
      throw new ApiError(403, "BLOCKED", "You cannot send messages to this user");
    }
  }

  const msg = await Message.create({
    conversationId: new Types.ObjectId(conversationId),
    senderId: new Types.ObjectId(senderId),
    content,
    attachments,
    readBy: [new Types.ObjectId(senderId)],
    isSystemMessage,
  });

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageId: msg._id,
        lastMessageAt: msg.createdAt,
      },
    },
  );

  if (!isSystemMessage && content.trim().length > 0) {
    translateMessageAsync(msg._id.toString(), content).catch((err) =>
      logError("MessageService", "translation failed", err, { messageId: msg._id.toString() }),
    );
  }

  const populatedMsg = await Message.findById(msg._id).lean();
  if (!populatedMsg) throw new ApiError(500, "INTERNAL_ERROR", "Failed to load message after creation");
  const sender = await User.findById(senderId).select("preferredLanguage").lean();
  const messageItem = buildMessageItem(populatedMsg, senderId, sender?.preferredLanguage ?? "en");

  wsEvents.emit("message:new", {
    recipientId,
    conversationId,
    message: messageItem,
  });

  return messageItem;
}

export async function getConversations(
  userId: string,
  page: number,
  limit: number,
  archived: boolean,
): Promise<{ conversations: ConversationItem[]; total: number; page: number; limit: number }> {
  const userObjectId = new Types.ObjectId(userId);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { participantIds: userObjectId };
  if (archived) {
    filter.archivedBy = userObjectId;
  } else {
    filter.archivedBy = { $ne: userObjectId };
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  const otherUserIds = conversations.map((c) => getOtherParticipantId(c, userId));
  const users = await User.find({ _id: { $in: otherUserIds } })
    .select("username avatarUrl")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const lastMessageIds = conversations.map((c) => c.lastMessageId).filter(Boolean);
  const lastMessages = await Message.find({ _id: { $in: lastMessageIds } }).lean();
  const lastMessageMap = new Map(lastMessages.map((m) => [m._id.toString(), m]));

  const unreadCounts = await Promise.all(
    conversations.map(async (c) => {
      const count = await Message.countDocuments({
        conversationId: c._id,
        readBy: { $ne: userObjectId },
        isDeleted: false,
        senderId: { $ne: userObjectId },
      });
      return [c._id.toString(), count] as [string, number];
    }),
  );
  const unreadMap = new Map(unreadCounts);

  const items: ConversationItem[] = conversations.map((c) => {
    const otherUserId = getOtherParticipantId(c, userId).toString();
    const otherUser = userMap.get(otherUserId);
    const lastMsg = c.lastMessageId ? lastMessageMap.get(c.lastMessageId.toString()) : null;

    return {
      id: c._id.toString(),
      otherUser: {
        id: otherUserId,
        username: otherUser?.username ?? "Unknown",
        avatarUrl: otherUser?.avatarUrl,
      },
      lastMessage: lastMsg
        ? {
            id: lastMsg._id.toString(),
            content: lastMsg.isDeleted ? "" : lastMsg.content,
            senderId: lastMsg.senderId.toString(),
            createdAt: lastMsg.createdAt.toISOString(),
            isDeleted: lastMsg.isDeleted,
          }
        : null,
      unreadCount: unreadMap.get(c._id.toString()) ?? 0,
      archived: c.archivedBy.some((id) => id.toString() === userId),
      muted: c.mutedBy.some((id) => id.toString() === userId),
      lastMessageAt: c.lastMessageAt.toISOString(),
    };
  });

  return { conversations: items, total, page, limit };
}

export async function getMessages(
  conversationId: string,
  userId: string,
  page: number,
  limit: number,
  before?: string,
): Promise<{ messages: MessageItem[]; hasMore: boolean; page: number; limit: number }> {
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  const isParticipant = conv.participantIds.some((id) => id.toString() === userId);
  if (!isParticipant) {
    throw new ApiError(403, "NOT_PARTICIPANT", "You are not a participant in this conversation");
  }

  const requester = await User.findById(userId).select("preferredLanguage").lean();

  const filter: Record<string, unknown> = { conversationId: new Types.ObjectId(conversationId) };
  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }

  const skip = (page - 1) * limit;
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .lean();

  const hasMore = messages.length > limit;
  const sliced = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: sliced.map((m) => buildMessageItem(m as unknown as LeanMessage, userId, requester?.preferredLanguage ?? "en")),
    hasMore,
    page,
    limit,
  };
}

export async function markAsRead(
  conversationId: string,
  userId: string,
  messageIds?: string[],
): Promise<{ marked: number }> {
  const userObjectId = new Types.ObjectId(userId);
  const conv = await Conversation.findById(conversationId).select("participantIds").lean();
  if (!conv) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  const isParticipant = conv.participantIds.some((id) => id.toString() === userId);
  if (!isParticipant) {
    throw new ApiError(403, "NOT_PARTICIPANT", "You are not a participant in this conversation");
  }

  const filter: Record<string, unknown> = {
    conversationId: new Types.ObjectId(conversationId),
    readBy: { $ne: userObjectId },
    senderId: { $ne: userObjectId },
  };
  if (messageIds && messageIds.length > 0) {
    filter._id = { $in: messageIds.map((id) => new Types.ObjectId(id)) };
  }

  const result = await Message.updateMany(filter, { $addToSet: { readBy: userObjectId } });

  if (result.modifiedCount > 0) {
    const otherUserId = getOtherParticipantId(conv, userId).toString();
    wsEvents.emit("message:read", {
      recipientId: otherUserId,
      conversationId,
      readByUserId: userId,
      count: result.modifiedCount,
    });
  }

  return { marked: result.modifiedCount };
}

export async function editMessage(
  userId: string,
  messageId: string,
  newContent: string,
): Promise<MessageItem> {
  const msg = await Message.findById(messageId);
  if (!msg) {
    throw new ApiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  }
  if (msg.senderId.toString() !== userId) {
    throw new ApiError(403, "NOT_AUTHOR", "You can only edit your own messages");
  }
  if (msg.isDeleted) {
    throw new ApiError(400, "MESSAGE_DELETED", "Cannot edit a deleted message");
  }

  const maxLength = await getMessageMaxLength();
  if (newContent.length > maxLength) {
    throw new ApiError(400, "MESSAGE_TOO_LONG", `Message exceeds ${maxLength} characters`);
  }

  msg.editHistory.push({ content: msg.content, editedAt: msg.editedAt ?? msg.createdAt });
  msg.content = newContent;
  msg.editedAt = new Date();
  await msg.save();

  translateMessageAsync(msg._id.toString(), newContent).catch((err) =>
    logError("MessageService", "re-translation failed", err, { messageId: msg._id.toString() }),
  );

  const conv = await Conversation.findById(msg.conversationId).lean();
  const recipientId = conv ? getOtherParticipantId(conv, userId).toString() : "";

  const updatedMsg = await Message.findById(messageId).lean();
  if (!updatedMsg) throw new ApiError(500, "INTERNAL_ERROR", "Failed to load message after edit");
  const editor = await User.findById(userId).select("preferredLanguage").lean();
  const messageItem = buildMessageItem(updatedMsg, userId, editor?.preferredLanguage ?? "en");

  wsEvents.emit("message:updated", {
    recipientId,
    conversationId: msg.conversationId.toString(),
    message: messageItem,
  });

  return messageItem;
}

export async function deleteMessage(userId: string, messageId: string): Promise<{ deleted: boolean }> {
  const msg = await Message.findById(messageId);
  if (!msg) {
    throw new ApiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  }
  if (msg.senderId.toString() !== userId) {
    throw new ApiError(403, "NOT_AUTHOR", "You can only delete your own messages");
  }
  if (msg.isDeleted) {
    return { deleted: true };
  }

  msg.isDeleted = true;
  msg.content = "";
  await msg.save();

  const conv = await Conversation.findById(msg.conversationId).lean();
  const recipientId = conv ? getOtherParticipantId(conv, userId).toString() : "";

  wsEvents.emit("message:deleted", {
    recipientId,
    conversationId: msg.conversationId.toString(),
    messageId,
  });

  return { deleted: true };
}

export async function addReaction(
  userId: string,
  messageId: string,
  emoji: string,
): Promise<{ reactions: Array<{ userId: string; emoji: string }> }> {
  const msg = await Message.findById(messageId);
  if (!msg) {
    throw new ApiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  }

  const existing = msg.reactions.find(
    (r) => r.userId.toString() === userId && r.emoji === emoji,
  );
  if (existing) {
    return { reactions: msg.reactions.map((r) => ({ userId: r.userId.toString(), emoji: r.emoji })) };
  }

  msg.reactions.push({ userId: new Types.ObjectId(userId), emoji });
  await msg.save();

  const conv = await Conversation.findById(msg.conversationId).lean();
  const recipientId = conv ? getOtherParticipantId(conv, userId).toString() : "";

  wsEvents.emit("message:reaction", {
    recipientId,
    conversationId: msg.conversationId.toString(),
    messageId,
    reactions: msg.reactions.map((r) => ({ userId: r.userId.toString(), emoji: r.emoji })),
  });

  return { reactions: msg.reactions.map((r) => ({ userId: r.userId.toString(), emoji: r.emoji })) };
}

export async function removeReaction(
  userId: string,
  messageId: string,
  emoji: string,
): Promise<{ reactions: Array<{ userId: string; emoji: string }> }> {
  const msg = await Message.findById(messageId);
  if (!msg) {
    throw new ApiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  }

  msg.reactions = msg.reactions.filter(
    (r) => !(r.userId.toString() === userId && r.emoji === emoji),
  );
  await msg.save();

  const conv = await Conversation.findById(msg.conversationId).lean();
  const recipientId = conv ? getOtherParticipantId(conv, userId).toString() : "";

  wsEvents.emit("message:reaction", {
    recipientId,
    conversationId: msg.conversationId.toString(),
    messageId,
    reactions: msg.reactions.map((r) => ({ userId: r.userId.toString(), emoji: r.emoji })),
  });

  return { reactions: msg.reactions.map((r) => ({ userId: r.userId.toString(), emoji: r.emoji })) };
}

export async function archiveConversation(userId: string, conversationId: string): Promise<{ archived: boolean }> {
  await Conversation.updateOne(
    { _id: conversationId, participantIds: new Types.ObjectId(userId) },
    { $addToSet: { archivedBy: new Types.ObjectId(userId) } },
  );
  return { archived: true };
}

export async function unarchiveConversation(userId: string, conversationId: string): Promise<{ unarchived: boolean }> {
  await Conversation.updateOne(
    { _id: conversationId, participantIds: new Types.ObjectId(userId) },
    { $pull: { archivedBy: new Types.ObjectId(userId) } },
  );
  return { unarchived: true };
}

export async function muteConversation(userId: string, conversationId: string): Promise<{ muted: boolean }> {
  await Conversation.updateOne(
    { _id: conversationId, participantIds: new Types.ObjectId(userId) },
    { $addToSet: { mutedBy: new Types.ObjectId(userId) } },
  );
  return { muted: true };
}

export async function unmuteConversation(userId: string, conversationId: string): Promise<{ unmuted: boolean }> {
  await Conversation.updateOne(
    { _id: conversationId, participantIds: new Types.ObjectId(userId) },
    { $pull: { mutedBy: new Types.ObjectId(userId) } },
  );
  return { unmuted: true };
}

export async function reportMessage(
  reporterId: string,
  messageId: string,
  reason: MessageReportReason,
): Promise<{ id: string; status: string }> {
  const msg = await Message.findById(messageId).select("_id conversationId senderId").lean();
  if (!msg) {
    throw new ApiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  }

  try {
    const report = await MessageReport.create({
      reporterId: new Types.ObjectId(reporterId),
      messageId: new Types.ObjectId(messageId),
      conversationId: msg.conversationId,
      reason,
    });

    await Message.updateOne({ _id: messageId }, { $inc: { reportCount: 1 } });

    const threshold = await getAutoHideThreshold();
    const updated = await Message.findById(messageId).select("reportCount isHidden").lean();
    if (updated && updated.reportCount >= threshold && !updated.isHidden) {
      await Message.updateOne({ _id: messageId }, { $set: { isHidden: true } });
    }

    return { id: report._id.toString(), status: report.status };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      throw new ApiError(409, "ALREADY_REPORTED", "You have already reported this message");
    }
    throw err;
  }
}

export async function getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
  const userObjectId = new Types.ObjectId(userId);
  const conversations = await Conversation.find({ participantIds: userObjectId }).select("_id").lean();
  const convIds = conversations.map((c) => c._id);

  const count = await Message.countDocuments({
    conversationId: { $in: convIds },
    readBy: { $ne: userObjectId },
    isDeleted: false,
    senderId: { $ne: userObjectId },
  });

  return { unreadCount: count };
}
