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

export const episodeParamSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  seasonNumber: z.coerce.number().int().positive(),
  episodeNumber: z.coerce.number().int().positive(),
});

export const discoverSectionParamSchema = z.object({
  sectionId: z.enum(["trending-tv", "trending-movie", "popular-tv", "popular-movie"]),
});

export const discoverSectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
