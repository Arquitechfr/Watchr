import { ImportJob } from "../../models/importJob.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { getImportQueue, type ImportJobData } from "../../workers/import.worker.js";
import { log } from "../../lib/logger.js";

export interface ListImportsQuery {
  status?: string;
  source?: string;
  search?: string;
  page: number;
  limit: number;
}

export async function listAllImports(query: ListImportsQuery) {
  const { status, source, search, page, limit } = query;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (search) {
    const users = await User.find({
      $or: [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id").lean();
    filter.userId = { $in: users.map((u) => u._id) };
  }

  const [jobs, total] = await Promise.all([
    ImportJob.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ImportJob.countDocuments(filter),
  ]);

  return {
    jobs: jobs.map((j) => {
      const populatedUser = j.userId as unknown as { _id?: { toString(): string }; username?: string; email?: string } | null;
      const isPopulated = populatedUser && typeof populatedUser === "object" && "_id" in populatedUser;
      return {
      id: j._id.toString(),
      userId: isPopulated ? (populatedUser as { _id: { toString(): string } })._id.toString() : "",
      username: isPopulated ? (populatedUser as { username?: string }).username ?? "Unknown" : "Unknown",
      email: isPopulated ? (populatedUser as { email?: string }).email ?? "" : "",
      source: j.source,
      status: j.status,
      progress: j.progress,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
      };
    }),
    total,
    page,
    limit,
  };
}

export async function getImportStats() {
  const [total, completed, failed, pending] = await Promise.all([
    ImportJob.countDocuments(),
    ImportJob.countDocuments({ status: "completed" }),
    ImportJob.countDocuments({ status: "failed" }),
    ImportJob.countDocuments({ status: "pending" }),
  ]);

  const bySource = await ImportJob.aggregate([
    { $group: { _id: "$source", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    total,
    completed,
    failed,
    pending,
    bySource: bySource.map((s) => ({ source: s._id, count: s.count })),
  };
}

export async function getImportDetail(id: string) {
  const job = await ImportJob.findById(id)
    .populate("userId", "username email")
    .lean();

  if (!job) return null;

  const populatedUser = job.userId as unknown as { _id?: { toString(): string }; username?: string; email?: string } | null;
  const isPopulated = populatedUser && typeof populatedUser === "object" && "_id" in populatedUser;

  return {
    id: job._id.toString(),
    userId: isPopulated ? (populatedUser as { _id: { toString(): string } })._id.toString() : "",
    username: isPopulated ? (populatedUser as { username?: string }).username ?? "Unknown" : "Unknown",
    email: isPopulated ? (populatedUser as { email?: string }).email ?? "" : "",
    source: job.source,
    status: job.status,
    sourceFile: job.sourceFile,
    progress: job.progress,
    errorLog: job.errorLog ?? [],
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function deleteImportJob(id: string): Promise<void> {
  const result = await ImportJob.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "IMPORT_NOT_FOUND", "Import job not found");
  }
}

export async function retryImportJob(id: string): Promise<{ success: boolean }> {
  const job = await ImportJob.findById(id);
  if (!job) {
    throw new ApiError(404, "IMPORT_NOT_FOUND", "Import job not found");
  }

  if (job.status === "processing" || job.status === "pending") {
    throw new ApiError(409, "IMPORT_IN_PROGRESS", "Import job is already in progress");
  }

  job.status = "pending";
  job.progress = { total: 0, processed: 0, matched: 0, failed: 0, pendingReview: 0 };
  job.errorLog = [];
  job.completedAt = undefined;
  await job.save();

  const queue = getImportQueue();
  const jobData: ImportJobData = {
    userId: job.userId.toString(),
    jobId: job._id.toString(),
    sourceFile: job.sourceFile,
    source: job.source as any,
  };
  await queue.add(`import-${job._id}`, jobData);

  log("AdminImport", "retry queued", { jobId: id, userId: job.userId.toString() });

  return { success: true };
}

export async function exportImportCsv(filter: {
  status?: string;
  source?: string;
  search?: string;
}): Promise<string> {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.source) query.source = filter.source;
  if (filter.search) {
    const users = await User.find({
      $or: [
        { username: { $regex: filter.search, $options: "i" } },
        { email: { $regex: filter.search, $options: "i" } },
      ],
    }).select("_id").lean();
    query.userId = { $in: users.map((u) => u._id) };
  }

  const jobs = await ImportJob.find(query)
    .populate("userId", "username email")
    .sort({ createdAt: -1 })
    .lean();

  const header = "id,username,email,source,status,total,processed,matched,failed,createdAt,completedAt\n";
  const rows = jobs.map((job) => {
    const populatedUser = job.userId as unknown as { username?: string; email?: string } | null;
    const escapeCsv = (val: string | undefined) => {
      if (!val) return "";
      return `"${val.replace(/"/g, '""')}"`;
    };
    return [
      job._id.toString(),
      escapeCsv(populatedUser?.username ?? "Unknown"),
      escapeCsv(populatedUser?.email ?? ""),
      job.source,
      job.status,
      job.progress?.total ?? 0,
      job.progress?.processed ?? 0,
      job.progress?.matched ?? 0,
      job.progress?.failed ?? 0,
      job.createdAt?.toISOString() ?? "",
      job.completedAt?.toISOString() ?? "",
    ].join(",");
  });

  return header + rows.join("\n");
}
