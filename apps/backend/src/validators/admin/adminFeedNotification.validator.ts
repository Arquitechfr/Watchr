import { z } from "zod";

export const listFeedNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
  type: z
    .enum([
      "user_registered",
      "new_comment",
      "new_rating",
      "new_contact",
      "new_report",
      "import_completed",
    ])
    .optional(),
});

export const feedNotificationIdParamSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
});
