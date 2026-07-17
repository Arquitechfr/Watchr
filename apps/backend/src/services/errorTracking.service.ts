import crypto from "crypto";
import { FilterQuery } from "mongoose";
import { ErrorIssue, IErrorIssue, ErrorIssueStatus, ErrorSeverity, ErrorPlatform } from "../models/errorIssue.model.js";
import { ErrorEvent, IBreadcrumb, IDeviceInfo, IUserContext } from "../models/errorEvent.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";

export interface CaptureErrorInput {
  type: string;
  message: string;
  stackTrace?: string;
  platform: ErrorPlatform;
  severity?: ErrorSeverity;
  appVersion?: string;
  deviceInfo?: IDeviceInfo;
  breadcrumbs?: IBreadcrumb[];
  userContext?: IUserContext;
  extra?: Record<string, unknown>;
}

function normalizeStackFrames(stackTrace: string | undefined): string {
  if (!stackTrace) return "";
  const lines = stackTrace.split("\n").slice(0, 5);
  return lines
    .map((line) =>
      line
        .replace(/\(.*?\)/g, "()")
        .replace(/file:.*?:/g, "file:")
        .replace(/https?:\/\/.*?\//g, "/")
        .trim(),
    )
    .join("|");
}

function computeFingerprint(type: string, stackTrace: string | undefined, platform: string): string {
  const normalized = normalizeStackFrames(stackTrace);
  return crypto
    .createHash("sha256")
    .update(`${type}|${normalized}|${platform}`)
    .digest("hex");
}

export async function captureError(input: CaptureErrorInput): Promise<{ issueId: string; eventId: string }> {
  const severity = input.severity ?? "error";
  const fingerprint = computeFingerprint(input.type, input.stackTrace, input.platform);

  try {
    const issue = await ErrorIssue.findOneAndUpdate(
      { fingerprint },
      {
        $setOnInsert: {
          fingerprint,
          type: input.type,
          message: input.message,
          platform: input.platform,
          stackTrace: input.stackTrace ?? "",
          firstSeen: new Date(),
        },
        $set: {
          lastSeen: new Date(),
          severity,
        },
        $inc: { count: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (issue.status === "resolved" || issue.status === "ignored") {
      issue.status = "unresolved";
      issue.resolvedAt = undefined;
      issue.resolvedBy = undefined;
      await issue.save();
    }

    const event = await ErrorEvent.create({
      issueId: issue._id,
      timestamp: new Date(),
      platform: input.platform,
      appVersion: input.appVersion,
      deviceInfo: input.deviceInfo ?? {},
      breadcrumbs: (input.breadcrumbs ?? []).slice(-30),
      userContext: input.userContext,
      stackTrace: input.stackTrace,
      extra: input.extra,
    });

    return { issueId: issue._id.toString(), eventId: event._id.toString() };
  } catch (err) {
    logError("ErrorTracking", "captureError failed", err);
    throw err;
  }
}

export async function captureBackendError(err: Error, req?: { path?: string; method?: string }): Promise<void> {
  try {
    await captureError({
      type: err.name || "Error",
      message: err.message,
      stackTrace: err.stack,
      platform: "backend",
      severity: "error",
      extra: {
        path: req?.path,
        method: req?.method,
      },
    });
  } catch (captureErr) {
    logError("ErrorTracking", "captureBackendError failed", captureErr);
  }
}

export interface ListIssuesQuery {
  status?: ErrorIssueStatus;
  platform?: ErrorPlatform;
  severity?: ErrorSeverity;
  search?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface ListIssuesResult {
  issues: Array<{
    id: string;
    type: string;
    message: string;
    status: ErrorIssueStatus;
    severity: ErrorSeverity;
    platform: ErrorPlatform;
    count: number;
    firstSeen: string;
    lastSeen: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

export async function listIssues(query: ListIssuesQuery): Promise<ListIssuesResult> {
  const { status, platform, severity, search, startDate, endDate, page, limit } = query;

  const filter: FilterQuery<IErrorIssue> = {};
  if (status) filter.status = status;
  if (platform) filter.platform = platform;
  if (severity) filter.severity = severity;
  if (search) {
    filter.$or = [
      { type: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
    ];
  }
  if (startDate || endDate) {
    filter.lastSeen = {};
    if (startDate) filter.lastSeen.$gte = new Date(startDate);
    if (endDate) filter.lastSeen.$lte = new Date(endDate);
  }

  const [issues, total] = await Promise.all([
    ErrorIssue.find(filter)
      .sort({ lastSeen: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ErrorIssue.countDocuments(filter),
  ]);

  return {
    issues: issues.map((i) => ({
      id: i._id.toString(),
      type: i.type,
      message: i.message,
      status: i.status,
      severity: i.severity,
      platform: i.platform,
      count: i.count,
      firstSeen: i.firstSeen.toISOString(),
      lastSeen: i.lastSeen.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export interface IssueDetail {
  id: string;
  type: string;
  message: string;
  status: ErrorIssueStatus;
  severity: ErrorSeverity;
  platform: ErrorPlatform;
  stackTrace: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  recentEvents: Array<{
    id: string;
    timestamp: string;
    appVersion: string | null;
    deviceInfo: IDeviceInfo;
    userContext?: IUserContext;
  }>;
}

export async function getIssueDetail(id: string): Promise<IssueDetail> {
  const issue = await ErrorIssue.findById(id).lean();
  if (!issue) {
    throw new ApiError(404, "NOT_FOUND", "Error issue not found");
  }

  const recentEvents = await ErrorEvent.find({ issueId: issue._id })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

  return {
    id: issue._id.toString(),
    type: issue.type,
    message: issue.message,
    status: issue.status,
    severity: issue.severity,
    platform: issue.platform,
    stackTrace: issue.stackTrace,
    count: issue.count,
    firstSeen: issue.firstSeen.toISOString(),
    lastSeen: issue.lastSeen.toISOString(),
    resolvedAt: issue.resolvedAt?.toISOString() ?? null,
    resolvedBy: issue.resolvedBy?.toString() ?? null,
    recentEvents: recentEvents.map((e) => ({
      id: e._id.toString(),
      timestamp: e.timestamp.toISOString(),
      appVersion: e.appVersion ?? null,
      deviceInfo: e.deviceInfo,
      userContext: e.userContext,
    })),
  };
}

export interface ListIssueEventsQuery {
  page: number;
  limit: number;
}

export interface ListIssueEventsResult {
  events: Array<{
    id: string;
    timestamp: string;
    platform: string;
    appVersion: string | null;
    deviceInfo: IDeviceInfo;
    breadcrumbs: IBreadcrumb[];
    userContext?: IUserContext;
    stackTrace: string | null;
    extra?: Record<string, unknown>;
  }>;
  total: number;
  page: number;
  limit: number;
}

export async function listIssueEvents(issueId: string, query: ListIssueEventsQuery): Promise<ListIssueEventsResult> {
  const { page, limit } = query;
  const filter = { issueId };

  const [events, total] = await Promise.all([
    ErrorEvent.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ErrorEvent.countDocuments(filter),
  ]);

  return {
    events: events.map((e) => ({
      id: e._id.toString(),
      timestamp: e.timestamp.toISOString(),
      platform: e.platform,
      appVersion: e.appVersion ?? null,
      deviceInfo: e.deviceInfo,
      breadcrumbs: e.breadcrumbs,
      userContext: e.userContext,
      stackTrace: e.stackTrace ?? null,
      extra: e.extra,
    })),
    total,
    page,
    limit,
  };
}

export async function updateIssueStatus(
  issueId: string,
  status: ErrorIssueStatus,
  adminId: string,
): Promise<{ status: ErrorIssueStatus }> {
  const update: Partial<IErrorIssue> = { status };
  if (status === "resolved") {
    update.resolvedAt = new Date();
    update.resolvedBy = adminId as unknown as IErrorIssue["resolvedBy"];
  } else {
    update.resolvedAt = undefined;
    update.resolvedBy = undefined;
  }

  const issue = await ErrorIssue.findByIdAndUpdate(issueId, { $set: update }, { new: true }).select("status").lean();
  if (!issue) {
    throw new ApiError(404, "NOT_FOUND", "Error issue not found");
  }

  log("ErrorTracking", "issue status updated", { issueId, status, adminId });
  return { status: issue.status };
}

export async function deleteIssue(issueId: string): Promise<void> {
  const issue = await ErrorIssue.findByIdAndDelete(issueId);
  if (!issue) {
    throw new ApiError(404, "NOT_FOUND", "Error issue not found");
  }
  await ErrorEvent.deleteMany({ issueId });
  log("ErrorTracking", "issue deleted", { issueId });
}

export interface ErrorStats {
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  bySeverity: Record<string, number>;
  total: number;
  last7Days: Array<{ date: string; count: number }>;
}

export async function getErrorStats(): Promise<ErrorStats> {
  const [byStatus, byPlatform, bySeverity, total, last7DaysEvents] = await Promise.all([
    ErrorIssue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ErrorIssue.aggregate([{ $group: { _id: "$platform", count: { $sum: 1 } } }]),
    ErrorIssue.aggregate([{ $group: { _id: "$severity", count: { $sum: 1 } } }]),
    ErrorIssue.countDocuments(),
    ErrorEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    byPlatform: Object.fromEntries(byPlatform.map((s) => [s._id, s.count])),
    bySeverity: Object.fromEntries(bySeverity.map((s) => [s._id, s.count])),
    total,
    last7Days: last7DaysEvents.map((d) => ({ date: d._id, count: d.count })),
  };
}
