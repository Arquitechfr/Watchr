import { z } from "zod";

export const createReportSchema = z.object({
  reason: z.enum(["spam", "unmarked_spoiler", "harassment", "inappropriate", "off_topic"]),
});

export const listReportsQuerySchema = z.object({
  status: z.enum(["pending", "resolved", "dismissed"]).optional(),
  reason: z.enum(["spam", "unmarked_spoiler", "harassment", "inappropriate", "off_topic"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reportIdParamSchema = z.object({
  id: z.string().min(1),
});
