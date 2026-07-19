import { z } from "zod";

export const emailHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["sent", "failed", "skipped"]).optional(),
  template: z.enum(["welcome", "reset_password", "ban_notification", "comment_deleted", "comment_hidden", "comment_spoiler", "custom"]).optional(),
  search: z.string().optional(),
});

export const emailIdParamSchema = z.object({
  id: z.string().min(1),
});

export const emailBroadcastSchema = z.object({
  subject: z.string().min(1).max(200),
  htmlContent: z.string().min(1),
  target: z.enum(["all", "locale"]),
  locale: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  deepLinkScreen: z.string().optional(),
  deepLinkParams: z.record(z.unknown()).optional(),
});

export const emailTargetedSchema = z.object({
  userId: z.string().min(1),
  subject: z.string().min(1).max(200),
  htmlContent: z.string().min(1),
  scheduledAt: z.string().datetime().optional(),
  deepLinkScreen: z.string().optional(),
  deepLinkParams: z.record(z.unknown()).optional(),
});
