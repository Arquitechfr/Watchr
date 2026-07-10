import { User } from "../../models/user.model.js";
import { Comment } from "../../models/comment.model.js";
import { Show } from "../../models/show.model.js";
import { ImportJob } from "../../models/importJob.model.js";
import { Favorite } from "../../models/favorite.model.js";
import { Rating } from "../../models/rating.model.js";

export interface AdminStats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  totalComments: number;
  totalShows: number;
  totalImports: number;
  totalFavorites: number;
  totalRatings: number;
  activePushTokens: number;
  totalAdmins: number;
}

export interface GrowthDataPoint {
  date: string;
  count: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    totalComments,
    totalShows,
    totalImports,
    totalFavorites,
    totalRatings,
    activePushTokens,
    totalAdmins,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Comment.countDocuments(),
    Show.countDocuments(),
    ImportJob.countDocuments(),
    Favorite.countDocuments(),
    Rating.countDocuments(),
    User.countDocuments({ expoPushToken: { $exists: true, $ne: null } }),
    User.countDocuments({ role: "admin" }),
  ]);

  return {
    totalUsers,
    newUsers7d,
    newUsers30d,
    totalComments,
    totalShows,
    totalImports,
    totalFavorites,
    totalRatings,
    activePushTokens,
    totalAdmins,
  };
}

export async function getUserGrowth(days: number = 30): Promise<GrowthDataPoint[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const results = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({ date: r._id, count: r.count }));
}

export async function getCommentActivity(days: number = 7): Promise<GrowthDataPoint[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const results = await Comment.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({ date: r._id, count: r.count }));
}

export async function getShowTypeBreakdown(): Promise<{ type: string; count: number }[]> {
  const results = await Show.aggregate([
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return results.map((r) => ({ type: r._id, count: r.count }));
}
