import { Types } from "mongoose";
import { User } from "../models/user.model.js";

export const TMDB_SYSTEM_USER_EMAIL = "tmdb-system@internal.watchr.app";
export const TMDB_SYSTEM_USER_USERNAME = "TMDB";

let cachedSystemUserId: Types.ObjectId | null = null;

export async function getTmdbSystemUserId(): Promise<Types.ObjectId> {
  if (cachedSystemUserId) {
    return cachedSystemUserId;
  }

  let userId: Types.ObjectId | null = null;

  const existing = await User.findOne({ email: TMDB_SYSTEM_USER_EMAIL }).select("_id").lean();
  if (existing) {
    userId = existing._id as Types.ObjectId;
  } else {
    try {
      const created = await User.create({
        email: TMDB_SYSTEM_USER_EMAIL,
        username: TMDB_SYSTEM_USER_USERNAME,
        isSystemUser: true,
        hasCompletedOnboarding: true,
        passwordHash: undefined,
      });
      userId = created._id as Types.ObjectId;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === 11000) {
        const retry = await User.findOne({ email: TMDB_SYSTEM_USER_EMAIL }).select("_id").lean();
        if (retry) {
          userId = retry._id as Types.ObjectId;
        }
      } else {
        throw err;
      }
    }
  }

  if (!userId) {
    throw new Error("Failed to resolve TMDB system user");
  }

  cachedSystemUserId = userId;
  return cachedSystemUserId;
}
