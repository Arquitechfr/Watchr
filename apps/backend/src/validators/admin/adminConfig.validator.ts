import { z } from "zod";

export const configKeyParamSchema = z.object({
  key: z.string().min(1),
});

export const setConfigSchema = z.object({
  value: z.string(),
  type: z.enum(["string", "number", "boolean", "json"]),
});
