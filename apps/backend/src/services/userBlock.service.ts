import { Types } from "mongoose";
import { UserBlock } from "../models/userBlock.model.js";
import { User } from "../models/user.model.js";
import { Conversation } from "../models/conversation.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";

export async function blockUser(blockerId: string, blockedId: string): Promise<{ blocked: boolean }> {
  if (blockerId === blockedId) {
    throw new ApiError(400, "CANNOT_BLOCK_SELF", "You cannot block yourself");
  }

  const blockedUser = await User.findById(blockedId).select("_id").lean();
  if (!blockedUser) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  try {
    await UserBlock.create({
      blockerId: new Types.ObjectId(blockerId),
      blockedId: new Types.ObjectId(blockedId),
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return { blocked: true };
    }
    throw err;
  }

  await Conversation.updateMany(
    { participantIds: { $all: [new Types.ObjectId(blockerId), new Types.ObjectId(blockedId)] } },
    { $addToSet: { archivedBy: new Types.ObjectId(blockerId) } },
  ).catch((err) => logError("UserBlock", "failed to archive conversations on block", err));

  log("UserBlock", "user blocked", { blockerId, blockedId });
  return { blocked: true };
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<{ unblocked: boolean }> {
  await UserBlock.deleteOne({
    blockerId: new Types.ObjectId(blockerId),
    blockedId: new Types.ObjectId(blockedId),
  });
  log("UserBlock", "user unblocked", { blockerId, blockedId });
  return { unblocked: true };
}

export async function getBlockedUsers(
  blockerId: string,
  page: number,
  limit: number,
): Promise<{
  users: Array<{ id: string; username: string; avatarUrl: string | undefined }>;
  total: number;
  page: number;
  limit: number;
}> {
  const skip = (page - 1) * limit;
  const [blocks, total] = await Promise.all([
    UserBlock.find({ blockerId: new Types.ObjectId(blockerId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserBlock.countDocuments({ blockerId: new Types.ObjectId(blockerId) }),
  ]);

  const blockedIds = blocks.map((b) => b.blockedId);
  const users = await User.find({ _id: { $in: blockedIds } })
    .select("username avatarUrl")
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const sortedUsers = blocks
    .map((b) => {
      const u = userMap.get(b.blockedId.toString());
      if (!u) return null;
      return {
        id: u._id.toString(),
        username: u.username,
        avatarUrl: u.avatarUrl,
      };
    })
    .filter((u): u is { id: string; username: string; avatarUrl: string | undefined } => u !== null);

  return { users: sortedUsers, total, page, limit };
}

export async function isBlocked(userId: string, targetUserId: string): Promise<boolean> {
  const block = await UserBlock.findOne({
    blockerId: new Types.ObjectId(userId),
    blockedId: new Types.ObjectId(targetUserId),
  })
    .select("_id")
    .lean();
  return !!block;
}

export async function isEitherBlocked(userId: string, otherUserId: string): Promise<boolean> {
  const blocks = await UserBlock.find({
    $or: [
      { blockerId: new Types.ObjectId(userId), blockedId: new Types.ObjectId(otherUserId) },
      { blockerId: new Types.ObjectId(otherUserId), blockedId: new Types.ObjectId(userId) },
    ],
  })
    .select("_id")
    .lean();
  return blocks.length > 0;
}
