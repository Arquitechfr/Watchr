import { Types } from "mongoose";
import { Conversation } from "../../models/conversation.model.js";
import { Message } from "../../models/message.model.js";
import { MessageReport } from "../../models/messageReport.model.js";
import { UserBlock } from "../../models/userBlock.model.js";
import { User } from "../../models/user.model.js";

export async function adminListConversations(
  page: number,
  limit: number,
  userId?: string,
): Promise<{
  conversations: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
}> {
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (userId) {
    filter.participantIds = new Types.ObjectId(userId);
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  const allUserIds = new Set<string>();
  for (const c of conversations) {
    for (const p of c.participantIds) {
      allUserIds.add(p.toString());
    }
  }

  const users = await User.find({ _id: { $in: Array.from(allUserIds).map((id) => new Types.ObjectId(id)) } })
    .select("username avatarUrl email")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const result = conversations.map((c) => ({
    id: c._id.toString(),
    participants: c.participantIds.map((p) => {
      const u = userMap.get(p.toString());
      return {
        id: p.toString(),
        username: u?.username ?? "Unknown",
        avatarUrl: u?.avatarUrl,
        email: u?.email,
      };
    }),
    lastMessageAt: c.lastMessageAt.toISOString(),
    archivedBy: c.archivedBy.map((a) => a.toString()),
    mutedBy: c.mutedBy.map((m) => m.toString()),
    createdAt: c.createdAt.toISOString(),
  }));

  return { conversations: result, total, page, limit };
}

export async function adminGetConversationDetail(conversationId: string): Promise<{
  conversation: Record<string, unknown>;
  messages: Array<Record<string, unknown>>;
}> {
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) {
    throw new Error("Conversation not found");
  }

  const userIds = conv.participantIds.map((p) => p.toString());
  const users = await User.find({ _id: { $in: conv.participantIds } })
    .select("username avatarUrl email")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const messages = await Message.find({ conversationId: conv._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return {
    conversation: {
      id: conv._id.toString(),
      participants: userIds.map((id) => {
        const u = userMap.get(id);
        return {
          id,
          username: u?.username ?? "Unknown",
          avatarUrl: u?.avatarUrl,
          email: u?.email,
        };
      }),
      lastMessageAt: conv.lastMessageAt.toISOString(),
      createdAt: conv.createdAt.toISOString(),
    },
    messages: messages.map((m) => ({
      id: m._id.toString(),
      senderId: m.senderId.toString(),
      content: m.isDeleted ? "[deleted]" : m.content,
      isDeleted: m.isDeleted,
      isSystemMessage: m.isSystemMessage,
      isHidden: m.isHidden,
      reportCount: m.reportCount,
      reactions: m.reactions,
      editedAt: m.editedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function adminListMessageReports(
  page: number,
  limit: number,
  status?: string,
): Promise<{
  reports: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
}> {
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (status) {
    filter.status = status;
  }

  const [reports, total] = await Promise.all([
    MessageReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MessageReport.countDocuments(filter),
  ]);

  const messageIds = reports.map((r) => r.messageId);
  const messages = await Message.find({ _id: { $in: messageIds } })
    .select("content isDeleted senderId conversationId isHidden")
    .lean();
  const messageMap = new Map(messages.map((m) => [m._id.toString(), m]));

  const reporterIds = reports.map((r) => r.reporterId);
  const reporters = await User.find({ _id: { $in: reporterIds } })
    .select("username")
    .lean();
  const reporterMap = new Map(reporters.map((u) => [u._id.toString(), u]));

  const result = reports.map((r) => {
    const msg = messageMap.get(r.messageId.toString());
    return {
      id: r._id.toString(),
      messageId: r.messageId.toString(),
      conversationId: r.conversationId.toString(),
      reporter: reporterMap.get(r.reporterId.toString())?.username ?? "Unknown",
      reason: r.reason,
      status: r.status,
      messageContent: msg?.isDeleted ? "[deleted]" : msg?.content ?? "[not found]",
      messageHidden: msg?.isHidden ?? false,
      resolvedBy: r.resolvedBy?.toString() ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return { reports: result, total, page, limit };
}

export async function adminResolveReport(
  reportId: string,
  adminId: string,
): Promise<{ resolved: boolean }> {
  await MessageReport.updateOne(
    { _id: reportId },
    { $set: { status: "resolved", resolvedBy: new Types.ObjectId(adminId), resolvedAt: new Date() } },
  );
  return { resolved: true };
}

export async function adminDismissReport(
  reportId: string,
  adminId: string,
): Promise<{ dismissed: boolean }> {
  await MessageReport.updateOne(
    { _id: reportId },
    { $set: { status: "dismissed", resolvedBy: new Types.ObjectId(adminId), resolvedAt: new Date() } },
  );
  return { dismissed: true };
}

export async function adminDeleteMessage(messageId: string): Promise<{ deleted: boolean }> {
  await Message.updateOne(
    { _id: messageId },
    { $set: { isDeleted: true, content: "" } },
  );
  return { deleted: true };
}

export async function adminGetMessageStats(): Promise<{
  totalConversations: number;
  totalMessages: number;
  pendingReports: number;
  totalBlocks: number;
  activeConversationsToday: number;
}> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [totalConversations, totalMessages, pendingReports, totalBlocks, activeConversationsToday] =
    await Promise.all([
      Conversation.countDocuments(),
      Message.countDocuments({ isDeleted: false }),
      MessageReport.countDocuments({ status: "pending" }),
      UserBlock.countDocuments(),
      Conversation.countDocuments({ lastMessageAt: { $gte: oneDayAgo } }),
    ]);

  return {
    totalConversations,
    totalMessages,
    pendingReports,
    totalBlocks,
    activeConversationsToday,
  };
}

export async function adminListBlocks(
  page: number,
  limit: number,
  userId?: string,
): Promise<{
  blocks: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
}> {
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  if (userId) {
    filter.blockerId = new Types.ObjectId(userId);
  }

  const [blocks, total] = await Promise.all([
    UserBlock.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserBlock.countDocuments(filter),
  ]);

  const allUserIds = new Set<string>();
  for (const b of blocks) {
    allUserIds.add(b.blockerId.toString());
    allUserIds.add(b.blockedId.toString());
  }

  const users = await User.find({ _id: { $in: Array.from(allUserIds).map((id) => new Types.ObjectId(id)) } })
    .select("username")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const result = blocks.map((b) => ({
    id: b._id.toString(),
    blocker: userMap.get(b.blockerId.toString())?.username ?? "Unknown",
    blocked: userMap.get(b.blockedId.toString())?.username ?? "Unknown",
    blockerId: b.blockerId.toString(),
    blockedId: b.blockedId.toString(),
    createdAt: b.createdAt.toISOString(),
  }));

  return { blocks: result, total, page, limit };
}
