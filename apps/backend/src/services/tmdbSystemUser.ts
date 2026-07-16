import { Types } from "mongoose";
import { User } from "../models/user.model.js";

export const TMDB_SYSTEM_USER_EMAIL = "tmdb-system@internal.watchr.app";
export const TMDB_SYSTEM_USER_USERNAME = "TMDB";

let cachedSystemUserId: Types.ObjectId | null = null;

export async function getTmdbSystemUserId(): Promise<Types.ObjectId> {
  if (cachedSystemUserId) {
    return cachedSystemUserId;
  }

  let user = await User.findOne({ email: TMDB_SYSTEM_USER_EMAIL }).select("_id").lean();

  if (!user) {
    user = await User.create({
      email: TMDB_SYSTEM_USER_EMAIL,
      username: TMDB_SYSTEM_USER_USERNAME,
      isSystemUser: true,
      hasCompletedOnboarding: true,
      passwordHash: undefined,
    });
  }

  cachedSystemUserId = user._id as Types.ObjectId;
  return cachedSystemUserId;
}
