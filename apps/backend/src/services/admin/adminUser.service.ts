import { FilterQuery } from "mongoose";
import { User } from "../../models/user.model.js";
import { Comment } from "../../models/comment.model.js";
import { WatchEntry } from "../../models/watchEntry.model.js";
import { Rating } from "../../models/rating.model.js";
import { ImportJob } from "../../models/importJob.model.js";
import { Favorite } from "../../models/favorite.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { getUserStats } from "../stats.service.js";

export interface ListUsersQuery {
  search?: string;
  role?: "user" | "admin";
  sortBy?: "createdAt" | "username" | "email" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
  page: number;
  limit: number;
}

export interface ListUsersResult {
  users: Array<{
    id: string;
    email: string;
    username: string;
    avatarUrl?: string;
    role: string;
    lastLoginAt: string | null;
    createdAt: string;
    hasCompletedOnboarding: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}

export async function listUsers(query: ListUsersQuery): Promise<ListUsersResult> {
  const { search, role, sortBy = "createdAt", sortOrder = "desc", page, limit } = query;

  const filter: FilterQuery<typeof User> = {};
  if (role) {
    filter.role = role;
  }
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ];
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortOptions: Record<string, 1 | -1> = { [sortBy]: sortDirection };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("email username avatarUrl role lastLoginAt createdAt hasCompletedOnboarding")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      username: u.username,
      avatarUrl: u.avatarUrl,
      role: u.role,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      hasCompletedOnboarding: u.hasCompletedOnboarding,
    })),
    total,
    page,
    limit,
  };
}

export interface AdminUserDetail {
  id: string;
  email: string;
  username: string;
  usernameChanged: boolean;
  avatarUrl?: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  preferredLanguage?: string;
  themePreference: string;
  hasCompletedOnboarding: boolean;
  googleLinked: boolean;
  expoPushToken?: string;
  notificationPreferences: Record<string, unknown>;
  stats: Awaited<ReturnType<typeof getUserStats>>;
  recentComments: Array<{
    id: string;
    content: string;
    showId: string;
    createdAt: string;
  }>;
  trackingCount: number;
  favoritesCount: number;
  ratingsCount: number;
  importJobsCount: number;
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  const [stats, recentComments, trackingCount, favoritesCount, ratingsCount, importJobsCount] = await Promise.all([
    getUserStats(userId, "en"),
    Comment.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).select("content showId createdAt").lean(),
    WatchEntry.countDocuments({ userId: user._id }),
    Favorite.countDocuments({ userId: user._id }),
    Rating.countDocuments({ userId: user._id }),
    ImportJob.countDocuments({ userId: user._id }),
  ]);

  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    usernameChanged: user.usernameChanged,
    avatarUrl: user.avatarUrl,
    role: user.role,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    preferredLanguage: user.preferredLanguage,
    themePreference: user.themePreference ?? "system",
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    googleLinked: !!user.firebaseUid,
    expoPushToken: user.expoPushToken,
    notificationPreferences: user.notificationPreferences as unknown as Record<string, unknown>,
    stats,
    recentComments: recentComments.map((c) => ({
      id: c._id.toString(),
      content: c.content,
      showId: c.showId?.toString() ?? "",
      createdAt: c.createdAt.toISOString(),
    })),
    trackingCount,
    favoritesCount,
    ratingsCount,
    importJobsCount,
  };
}

export async function updateUserStatus(
  userId: string,
  action: "ban" | "unban" | "suspend",
): Promise<{ status: string }> {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  switch (action) {
    case "ban":
      user.hasCompletedOnboarding = false;
      await User.updateOne({ _id: userId }, { $unset: { expoPushToken: "" } });
      break;
    case "unban":
      user.hasCompletedOnboarding = user.hasCompletedOnboarding;
      break;
    case "suspend":
      await User.updateOne({ _id: userId }, { $unset: { expoPushToken: "" } });
      break;
  }

  await user.save();
  return { status: action };
}

export async function updateUserRole(userId: string, role: "user" | "admin"): Promise<{ role: string }> {
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select("role").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  return { role: user.role };
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }
  if (user.role === "admin") {
    throw new ApiError(403, "CANNOT_DELETE_ADMIN", "Cannot delete an admin user");
  }

  await Promise.all([
    Comment.deleteMany({ userId }),
    WatchEntry.deleteMany({ userId }),
    Favorite.deleteMany({ userId }),
    Rating.deleteMany({ userId }),
    ImportJob.deleteMany({ userId }),
    User.deleteOne({ _id: userId }),
  ]);
}
