import { z } from "zod";

export const listShowsQuerySchema = z.object({
  type: z.enum(["tv", "movie"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const syncShowSchema = z.object({
  type: z.enum(["tv", "movie"]),
});

export const showIdParamSchema = z.object({
  id: z.string().min(1),
});

export const aiShowIdParamSchema = z.object({
  showId: z.string().min(1),
});

export const tmdbIdParamSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
});
