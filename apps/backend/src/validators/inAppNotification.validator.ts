import { z } from "zod";

export const createInAppNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
  target: z.enum(["all", "locale", "user"]).default("all"),
  locale: z.string().optional(),
  userId: z.string().min(1).optional(),
  deepLinkScreen: z.string().optional(),
  deepLinkParams: z.record(z.unknown()).optional(),
  customUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const inAppNotificationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listInAppNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  target: z.enum(["all", "locale", "user"]).optional(),
});

export type CreateInAppNotificationInput = z.infer<typeof createInAppNotificationSchema>;
