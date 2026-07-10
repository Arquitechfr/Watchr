import { z } from "zod";

export const listAiLogsQuerySchema = z.object({
  service: z.string().optional(),
  status: z.enum(["success", "error"]).optional(),
  feature: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const aiLogIdParamSchema = z.object({
  id: z.string().min(1),
});

export const aiStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const AI_FLAG_KEYS = [
  "ai_spoiler_detection_enabled",
  "ai_toxic_detection_enabled",
  "ai_recommendations_enabled",
  "ai_search_enabled",
  "ai_import_matching_enabled",
  "ai_news_summary_enabled",
  "ai_thread_summary_enabled",
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
] as const;

export const aiFlagParamSchema = z.object({
  key: z.enum(AI_FLAG_KEYS),
});

export const setAiFlagSchema = z.object({
  value: z.boolean(),
});
