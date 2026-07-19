import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().length(24),
});

export const blockListQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});
