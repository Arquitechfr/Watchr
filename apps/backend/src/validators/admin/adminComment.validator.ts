import { z } from "zod";

export const listCommentsQuerySchema = z.object({
  showId: z.string().optional(),
  userId: z.string().optional(),
  isSpoiler: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  isHidden: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  minReports: z.coerce.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const commentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const markSpoilerSchema = z.object({
  isSpoiler: z.boolean(),
});

export const bulkDeleteSchema = z.object({
  commentIds: z.array(z.string().min(1)).min(1).max(100),
});
