import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read", "write"])).min(1).max(2),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.enum(["read", "write"])).min(1).max(2).optional(),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().min(1, "API key ID is required"),
});
