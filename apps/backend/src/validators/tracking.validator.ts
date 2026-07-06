import { z } from "zod";

export const watchStatusSchema = z.enum(["watching", "completed", "plan_to_watch", "dropped"]);

export const watchedEpisodeSchema = z.object({
  season: z.coerce.number().int().min(0),
  episode: z.coerce.number().int().min(1),
  watchedAt: z.coerce.date().optional(),
});

export const upsertTrackingSchema = z.object({
  status: watchStatusSchema.optional(),
  watchedEpisodes: z.array(watchedEpisodeSchema).optional(),
  currentSeason: z.coerce.number().int().min(0).optional(),
  currentEpisode: z.coerce.number().int().min(1).optional(),
});

export const toggleDroppedSchema = z.object({
  dropped: z.boolean(),
});

export const toggleEpisodeSchema = z.object({
  season: z.coerce.number().int().min(0),
  episode: z.coerce.number().int().min(1),
  watched: z.boolean(),
});

export const markUpToSchema = z.object({
  season: z.coerce.number().int().min(0),
  episode: z.coerce.number().int().min(1),
  includePrevious: z.boolean().default(true),
});

export const markAllAiredSchema = z.object({
  season: z.coerce.number().int().min(0).optional(),
});

export const unmarkSeasonSchema = z.object({
  season: z.coerce.number().int().min(1),
});

export const listTrackingSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: watchStatusSchema.optional(),
});

export const librarySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["tv", "movie"]).optional(),
});

export const unwatchedSchema = z.object({
  type: z.enum(["tv", "movie"]).optional(),
});

export const addToWatchlistByTmdbSchema = z.object({
  type: z.enum(["tv", "movie"]),
});

export const addToWatchlistByTmdbParamsSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
});

export const batchAddToWatchlistSchema = z.object({
  items: z
    .array(
      z.object({
        tmdbId: z.number().int().positive(),
        type: z.enum(["tv", "movie"]),
      }),
    )
    .min(1)
    .max(50),
});
