import { z } from "zod";

export const episodeRefSchema = z
  .object({
    season: z.coerce.number().int().min(0),
    episode: z.coerce.number().int().min(1),
  })
  .optional();

export const createCommentSchema = z.object({
  showId: z.string().min(1, "Show ID is required"),
  episodeRef: episodeRefSchema,
  parentId: z.string().optional(),
  content: z.string().min(1, "Content is required").max(2000, "Content is too long"),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content is too long"),
});

export const commentParamsSchema = z.object({
  id: z.string().min(1, "Comment ID is required"),
});

export const showCommentsParamsSchema = z.object({
  showId: z.string().min(1, "Show ID is required"),
});

export const listCommentsQuerySchema = z.object({
  season: z.coerce.number().int().min(0).optional(),
  episode: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
