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
] as const;

export const aiFlagParamSchema = z.object({
  key: z.enum(AI_FLAG_KEYS),
});

export const setAiFlagSchema = z.object({
  value: z.boolean(),
});
