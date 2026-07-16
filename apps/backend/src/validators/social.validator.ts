import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid userId format"),
});

export const activityVisibilitySchema = z.object({
  activityVisibility: z.enum(["private", "public"]),
});

export const activityFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
