import { z } from "zod";

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
  sortBy: z.enum(["createdAt", "username", "email", "lastLoginAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateUserStatusSchema = z.object({
  action: z.enum(["ban", "unban", "suspend", "unsuspend"]),
  reason: z.string().min(1, "Reason is required").max(500),
  delayHours: z.number().int().min(0).max(720).default(0),
  durationDays: z.number().int().min(1).max(365).optional(),
});

export const cancelBanSchema = z.object({
  actionId: z.string().min(1),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});
