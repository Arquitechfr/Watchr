import { z } from "zod";

export const createNewsSourceSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  url: z.string().url(),
  locale: z.string().min(2).max(5),
});

export const updateNewsSourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  locale: z.string().min(2).max(5).optional(),
  isActive: z.boolean().optional(),
});

export const newsSourceIdParamSchema = z.object({
  id: z.string().min(1),
});
