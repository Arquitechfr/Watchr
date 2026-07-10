import { z } from "zod";

export const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  target: z.enum(["all", "locale"]),
  locale: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export const targetedSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
});

export const notificationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
