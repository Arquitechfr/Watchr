import { z } from "zod";

export const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  target: z.enum(["all", "locale"]),
  locale: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
  deepLinkScreen: z.string().optional(),
  deepLinkParams: z.record(z.unknown()).optional(),
});

export const targetedSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
  deepLinkScreen: z.string().optional(),
  deepLinkParams: z.record(z.unknown()).optional(),
});

export const scheduledJobIdParamSchema = z.object({
  jobId: z.string().min(1),
});

export const updateScheduledJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(500).optional(),
  subject: z.string().min(1).max(200).optional(),
  htmlContent: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  deepLinkScreen: z.string().nullable().optional(),
  deepLinkParams: z.record(z.unknown()).nullable().optional(),
});

export const notificationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["broadcast", "targeted", "automated"]).optional(),
  search: z.string().optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().min(1),
});
