import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { validateRequest } from "../validators/validateRequest.js";
import { inAppNotificationIdParamSchema } from "../validators/inAppNotification.validator.js";
import { getActiveNotificationsForUser, dismissNotification } from "../services/inAppNotification.service.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const notifications = await getActiveNotificationsForUser(req.userId!, req.preferredLanguage);
    res.json({
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.body,
        imageUrl: n.imageUrl ?? null,
        data: n.data ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  }),
);

router.post(
  "/:id/dismiss",
  requireAuth,
  validateRequest(undefined, undefined, inAppNotificationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await dismissNotification(req.userId!, req.params.id);
    res.status(204).send();
  }),
);

export default router;
