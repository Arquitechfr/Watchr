import { z } from "zod";

export const listErrorsQuerySchema = z.object({
  status: z.enum(["unresolved", "resolved", "ignored"]).optional(),
  platform: z.enum(["ios", "android", "web", "backend"]).optional(),
  severity: z.enum(["error", "warning", "info"]).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const errorIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateErrorStatusSchema = z.object({
  status: z.enum(["unresolved", "resolved", "ignored"]),
});

export const listErrorEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const captureErrorSchema = z.object({
  type: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  stackTrace: z.string().max(10000).optional(),
  platform: z.enum(["ios", "android", "web"]),
  severity: z.enum(["error", "warning", "info"]).optional(),
  appVersion: z.string().max(50).optional(),
  deviceInfo: z
    .object({
      os: z.string().max(100).optional(),
      osVersion: z.string().max(100).optional(),
      deviceModel: z.string().max(200).optional(),
      screenResolution: z.string().max(50).optional(),
    })
    .optional(),
  breadcrumbs: z
    .array(
      z.object({
        timestamp: z.coerce.date().optional(),
        type: z.string().max(50),
        message: z.string().max(500),
        data: z.record(z.unknown()).optional(),
      }),
    )
    .max(30)
    .optional(),
  userContext: z
    .object({
      userId: z.string().max(100).optional(),
      username: z.string().max(100).optional(),
    })
    .optional(),
  extra: z.record(z.unknown()).optional(),
});
