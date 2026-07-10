import { z } from "zod";

export const episodeRefSchema = z
  .object({
    season: z.coerce.number().int().min(0),
    episode: z.coerce.number().int().min(1),
  })
  .optional();

export const upsertRatingSchema = z.object({
  showId: z.string().min(1, "Show ID is required"),
  episodeRef: episodeRefSchema,
  value: z.coerce.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

export const showIdParamSchema = z.object({
  showId: z.string().min(1, "Show ID is required"),
});

export const ratingIdParamSchema = z.object({
  id: z.string().min(1, "Rating ID is required"),
});
