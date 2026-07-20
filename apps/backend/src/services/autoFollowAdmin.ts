import { Types } from "mongoose";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { logError } from "../lib/logger.js";

/**
 * Reads the default_admin_user_id from MobileConfig.
 * Returns null if the key is missing or empty.
 */
export async function getAdminUserId(): Promise<string | null> {
  const entry = await MobileConfig.findOne({ key: "default_admin_user_id" }).lean();
  if (!entry || !entry.value) return null;
  return entry.value;
}

/**
 * Creates a bidirectional follow relationship between a new user and the admin.
 * - user follows admin
 * - admin follows user
 *
 * Non-blocking: errors are logged but not propagated.
 * Idempotent: duplicate key errors are silently ignored.
 */
export async function autoFollowAdmin(userId: string): Promise<void> {
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return;

    if (adminId === userId) return;

    const admin = await User.findById(adminId).select("_id").lean();
    if (!admin) {
      logError("autoFollowAdmin", `Admin user not found: ${adminId}`, null);
      return;
    }

    const userObjectId = new Types.ObjectId(userId);
    const adminObjectId = new Types.ObjectId(adminId);

    const operations = [
      {
        updateOne: {
          filter: { followerId: userObjectId, followingId: adminObjectId },
          update: { $setOnInsert: { followerId: userObjectId, followingId: adminObjectId } },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { followerId: adminObjectId, followingId: userObjectId },
          update: { $setOnInsert: { followerId: adminObjectId, followingId: userObjectId } },
          upsert: true,
        },
      },
    ] as Parameters<typeof Follow.bulkWrite>[0];

    await Follow.bulkWrite(operations, { ordered: false });
  } catch (err) {
    logError("autoFollowAdmin", `Failed to auto-follow admin for user ${userId}`, err);
  }
}
