import { z } from "zod";

export const tmdbSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["multi", "tv", "movie"]).default("multi"),
});

export const tmdbSeasonParamSchema = z.object({
  tmdbId: z.coerce.number().int().min(1),
  seasonNumber: z.coerce.number().int().min(0),
});
