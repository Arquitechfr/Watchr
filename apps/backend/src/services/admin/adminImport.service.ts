import { ImportJob } from "../../models/importJob.model.js";

export interface ListImportsQuery {
  status?: string;
  source?: string;
  page: number;
  limit: number;
}

export async function listAllImports(query: ListImportsQuery) {
  const { status, source, page, limit } = query;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (source) filter.source = source;

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
