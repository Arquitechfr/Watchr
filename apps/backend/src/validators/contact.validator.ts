import { z } from "zod";

export const createContactSchema = z.object({
  category: z.enum(["bug", "suggestion", "question", "other"]),
  subject: z.string().trim().min(3).max(100),
  message: z.string().trim().min(10).max(2000),
});

export const createPublicContactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(200),
  category: z.enum(["bug", "suggestion", "question", "other"]),
  subject: z.string().trim().min(3).max(100),
  message: z.string().trim().min(10).max(2000),
});

export const listContactQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["new", "read", "resolved", "archived"]).optional(),
  category: z.enum(["bug", "suggestion", "question", "other"]).optional(),
  search: z.string().trim().max(200).optional(),
});

export const contactIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(["new", "read", "resolved", "archived"]),
});

export const replyContactSchema = z.object({
  replyMessage: z.string().trim().min(10).max(5000),
});

export const bulkContactSchema = z.object({
  ids: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).max(100),
  action: z.enum(["read", "archive", "delete"]),
});

export const editReplySchema = z.object({
  replyMessage: z.string().trim().min(10).max(5000),
});

export const exportContactQuerySchema = z.object({
  status: z.enum(["new", "read", "resolved", "archived"]).optional(),
  category: z.enum(["bug", "suggestion", "question", "other"]).optional(),
  search: z.string().trim().max(200).optional(),
});
