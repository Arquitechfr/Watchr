import { z } from "zod";

export const favoriteParamsSchema = z.object({
  showId: z.string().min(1),
});

export const favoriteQuerySchema = z.object({
  type: z.enum(["tv", "movie"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
