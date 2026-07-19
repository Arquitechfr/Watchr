import { z } from "zod";

export const archiveConversationSchema = z.object({
  archived: z.boolean(),
});

export const muteConversationSchema = z.object({
  muted: z.boolean(),
});
