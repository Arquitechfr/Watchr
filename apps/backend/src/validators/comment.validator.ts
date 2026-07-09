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
  parentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parentId format").optional(),
  content: z.string().min(1, "Content is required").max(2000, "Content is too long"),
  images: z.array(z.string().url()).max(3).optional(),
  isSpoiler: z.boolean().optional().default(false),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content is too long"),
  images: z.array(z.string().url()).max(3).optional(),
  isSpoiler: z.boolean().optional(),
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
  sort: z.enum(["relevant", "liked", "replied", "recent"]).optional().default("recent"),
});

export const reactionBodySchema = z.object({
  emoji: z.string().emoji("Emoji is required").min(1, "Emoji is required"),
});

export const listRepliesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
