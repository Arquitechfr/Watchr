import { z } from "zod";

export const listImportsQuerySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});

export const importIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export const exportImportQuerySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  search: z.string().trim().max(200).optional(),
});
