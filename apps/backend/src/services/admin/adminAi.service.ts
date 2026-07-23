import { AiLog } from "../../models/aiLog.model.js";
import { MobileConfig } from "../../models/MobileConfig.js";
import { mistralService } from "../mistral.service.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { setConfig } from "./adminConfig.service.js";

const AI_FLAGS = [
  "ai_spoiler_detection_enabled",
  "ai_toxic_detection_enabled",
  "ai_recommendations_enabled",
  "ai_search_enabled",
  "ai_import_matching_enabled",
  "ai_news_summary_enabled",
  "ai_thread_summary_enabled",
  "ai_comment_translation_enabled",
  "ai_push_personalization_enabled",
  "ai_insights_enabled",
  "ai_mood_recommendations_enabled",
  "ai_similar_shows_enabled",
  "ai_email_digest_enabled",
  "ai_semantic_search_enabled",
  "ai_onboarding_suggestions_enabled",
  "ai_admin_assistant_enabled",
  "ai_news_filtering_enabled",
  "ai_reengagement_enabled",
  "ai_year_in_review_enabled",
  "ai_anomaly_detection_enabled",
  "ai_episode_summary_enabled",
  "ai_tags_enrichment_enabled",
];

export async function getAiStats(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalAgg, serviceAgg, dailyAgg, tokenAgg, latencyAgg] = await Promise.all([
    AiLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    AiLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$service", count: { $sum: 1 }, errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),
    AiLog.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AiLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          promptTokens: { $sum: "$tokens.prompt" },
          completionTokens: { $sum: "$tokens.completion" },
          totalTokens: { $sum: "$tokens.total" },
        },
      },
    ]),
    AiLog.aggregate([
      { $match: { createdAt: { $gte: since }, status: "success" } },
      { $group: { _id: null, avgLatency: { $avg: "$latencyMs" }, maxLatency: { $max: "$latencyMs" }, minLatency: { $min: "$latencyMs" } } },
    ]),
  ]);

  const totalCalls = totalAgg.reduce((sum, item) => sum + item.count, 0);
  const errorCount = totalAgg.find((item) => item._id === "error")?.count ?? 0;
  const successCount = totalAgg.find((item) => item._id === "success")?.count ?? 0;
  const tokens = tokenAgg[0] ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const latency = latencyAgg[0] ?? { avgLatency: 0, maxLatency: 0, minLatency: 0 };

  return {
    totalCalls,
    successCount,
    errorCount,
    successRate: totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 100,
    tokens: {
      prompt: tokens.promptTokens ?? 0,
      completion: tokens.completionTokens ?? 0,
      total: tokens.totalTokens ?? 0,
    },
    latency: {
      avg: Math.round(latency.avgLatency ?? 0),
      max: latency.maxLatency ?? 0,
      min: latency.minLatency ?? 0,
    },
    byService: serviceAgg.map((item) => ({
      service: item._id,
      count: item.count,
      errors: item.errors,
    })),
    daily: dailyAgg.map((item) => ({
      date: item._id,
      total: item.total,
      errors: item.errors,
    })),
  };
}

export async function getAiLogs(filters: {
  service?: string;
  status?: "success" | "error";
  feature?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  const query: Record<string, unknown> = {};

  if (filters.service) query.service = filters.service;
  if (filters.status) query.status = filters.status;
  if (filters.feature) query.feature = filters.feature;

  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.$lte = new Date(filters.endDate);
    query.createdAt = dateFilter;
  }

  if (filters.search) {
    query.$or = [
      { service: { $regex: filters.search, $options: "i" } },
      { action: { $regex: filters.search, $options: "i" } },
      { feature: { $regex: filters.search, $options: "i" } },
      { errorMessage: { $regex: filters.search, $options: "i" } },
      { aiModel: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [logs, total] = await Promise.all([
    AiLog.find(query)
      .sort({ createdAt: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .lean(),
    AiLog.countDocuments(query),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log._id.toString(),
      service: log.service,
      action: log.action,
      feature: log.feature,
      status: log.status,
      model: log.aiModel,
      tokens: log.tokens,
      latencyMs: log.latencyMs,
      userId: log.userId?.toString(),
      errorMessage: log.errorMessage ?? null,
      metadata: log.metadata ?? {},
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

export async function getAiLogDetail(id: string) {
  const log = await AiLog.findById(id).lean();
  if (!log) return null;

  return {
    id: log._id.toString(),
    service: log.service,
    action: log.action,
    feature: log.feature,
    status: log.status,
    model: log.aiModel,
    tokens: log.tokens,
    latencyMs: log.latencyMs,
    userId: log.userId?.toString(),
    errorMessage: log.errorMessage ?? null,
    prompt: log.prompt ?? null,
    response: log.response ?? null,
    metadata: log.metadata ?? {},
    createdAt: log.createdAt.toISOString(),
  };
}

export async function getAiStatus() {
  return {
    configured: mistralService.isConfigured(),
    apiKeysCount: mistralService.getApiKeysCount(),
    defaultChatModel: "mistral-small-latest",
    fallbackChatModel: "mistral-large-latest",
    defaultEmbeddingsModel: "mistral-embed",
    rateLimiter: {
      capacity: 60,
      refillRate: "60 per 60s",
    },
  };
}

export async function getAiFlags() {
  const entries = await MobileConfig.find({ key: { $in: AI_FLAGS } }).lean();
  const flagMap = new Map(entries.map((e) => [e.key, e.value === "true"]));

  return AI_FLAGS.map((key) => ({
    key,
    enabled: flagMap.get(key) ?? false,
    description: entries.find((e) => e.key === key)?.description ?? "",
  }));
}

export async function setAiFlag(
  key: string,
  value: boolean,
  updatedBy: string,
) {
  if (!AI_FLAGS.includes(key)) {
    throw new ApiError(400, "INVALID_FLAG", `Unknown AI flag: ${key}`);
  }

  const result = await setConfig(key, String(value), "boolean", updatedBy);
  return { key, enabled: value, updatedBy: result.updatedBy };
}
