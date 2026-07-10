import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { User } from "../models/user.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Comment } from "../models/comment.model.js";

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_anomaly_detection_enabled" }).lean();
  return entry?.value === "true";
}

export interface AnomalyAlert {
  userId: string;
  username: string;
  type: "comment_spam" | "rating_bombing" | "mass_tracking" | "unusual_activity";
  severity: "low" | "medium" | "high";
  description: string;
  detectedAt: Date;
}

const COMMENT_SPAM_THRESHOLD = 50;
const COMMENT_SPAM_WINDOW_HOURS = 1;
const RATING_BOMB_THRESHOLD = 20;
const RATING_BOMB_WINDOW_HOURS = 1;
const MASS_TRACKING_THRESHOLD = 100;
const MASS_TRACKING_WINDOW_HOURS = 1;

export async function detectAnomalies(): Promise<AnomalyAlert[]> {
  const enabled = await isFeatureEnabled();
  if (!enabled) {
    return [];
  }

  const alerts: AnomalyAlert[] = [];

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - COMMENT_SPAM_WINDOW_HOURS * 60 * 60 * 1000);

  const commentSpammers = await Comment.aggregate([
    { $match: { createdAt: { $gte: oneHourAgo } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gte: COMMENT_SPAM_THRESHOLD } } },
  ]);

  for (const spammer of commentSpammers) {
    const user = await User.findById(spammer._id).select("username").lean();
    if (!user) continue;

    alerts.push({
      userId: spammer._id.toString(),
      username: user.username,
      type: "comment_spam",
      severity: spammer.count > 100 ? "high" : "medium",
      description: `${spammer.count} comments in the last hour (threshold: ${COMMENT_SPAM_THRESHOLD})`,
      detectedAt: now,
    });
  }

  const ratingWindow = new Date(now.getTime() - RATING_BOMB_WINDOW_HOURS * 60 * 60 * 1000);
  const ratingBombers = await WatchEntry.aggregate([
    { $match: { "rating": { $gt: 0 }, "updatedAt": { $gte: ratingWindow } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gte: RATING_BOMB_THRESHOLD } } },
  ]);

  for (const bomber of ratingBombers) {
    const user = await User.findById(bomber._id).select("username").lean();
    if (!user) continue;

    alerts.push({
      userId: bomber._id.toString(),
      username: user.username,
      type: "rating_bombing",
      severity: bomber.count > 50 ? "high" : "medium",
      description: `${bomber.count} ratings in the last hour (threshold: ${RATING_BOMB_THRESHOLD})`,
      detectedAt: now,
    });
  }

  const trackingWindow = new Date(now.getTime() - MASS_TRACKING_WINDOW_HOURS * 60 * 60 * 1000);
  const massTrackers = await WatchEntry.aggregate([
    { $match: { "updatedAt": { $gte: trackingWindow } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gte: MASS_TRACKING_THRESHOLD } } },
  ]);

  for (const tracker of massTrackers) {
    const user = await User.findById(tracker._id).select("username").lean();
    if (!user) continue;

    alerts.push({
      userId: tracker._id.toString(),
      username: user.username,
      type: "mass_tracking",
      severity: tracker.count > 200 ? "high" : "low",
      description: `${tracker.count} tracking updates in the last hour (threshold: ${MASS_TRACKING_THRESHOLD})`,
      detectedAt: now,
    });
  }

  log("AIAnomalyDetection", "detection complete", { alertCount: alerts.length });
  return alerts;
}
