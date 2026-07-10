import { z } from "zod";

export const improveTextSchema = z.object({
  text: z.string().min(1).max(10000),
  format: z.enum(["plain", "html"]).default("plain"),
});
