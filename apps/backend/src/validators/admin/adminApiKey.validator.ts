import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read", "write"])).min(1).max(2),
});

export const listApiKeysQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
  search: z.string().min(1).optional(),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().min(1, "API key ID is required"),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.enum(["read", "write"])).min(1).max(2).optional(),
});
