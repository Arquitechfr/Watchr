import { z } from "zod";

export const targetUserIdParamSchema = z.object({
  targetUserId: z.string().length(24),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().length(24),
});

export const messageIdParamSchema = z.object({
  messageId: z.string().length(24),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  attachments: z
    .array(
      z.object({
        type: z.enum(["show", "image"]),
        showTmdbId: z.number().optional(),
        showTitle: z.string().optional(),
        showPosterPath: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const reportMessageSchema = z.object({
  reason: z.enum(["spam", "harassment", "inappropriate", "off_topic", "other"]),
});

export const conversationListQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  archived: z.string().optional().default("false"),
});

export const messageListQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("50"),
  before: z.string().optional(),
});

export const markReadSchema = z.object({
  messageIds: z.array(z.string().length(24)).optional(),
});
