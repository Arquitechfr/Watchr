import { z } from "zod";

export const searchSchema = z.object({
  q: z.string().min(1, "Query is required").max(200),
});

export const tmdbIdParamSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
});

export const seasonParamSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  seasonNumber: z.coerce.number().int().positive(),
});
