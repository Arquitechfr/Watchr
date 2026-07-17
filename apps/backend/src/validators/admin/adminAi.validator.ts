import { z } from "zod";

export const improveTextSchema = z.object({
  text: z.string().min(1).max(10000),
  format: z.enum(["plain", "html"]).default("plain"),
});

export const translatePreviewSchema = z.object({
  title: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  subject: z.string().max(500).optional(),
  htmlContent: z.string().max(50000).optional(),
  targetLangs: z.array(z.string().min(2).max(10)).min(1).max(10),
});
