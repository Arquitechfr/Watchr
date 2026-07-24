import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  startSubscription,
  cancelSubscription,
  getSubscriptionStatus,
} from "../services/subscription.service.js";

const router: Router = Router();

router.use(requireAuth);

router.post(
  "/start",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await startSubscription(req.userId!);
    res.json(result);
  }),
);

router.post(
  "/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    await cancelSubscription(req.userId!);
    res.json({ success: true });
  }),
);

router.get(
  "/status",
  asyncHandler(async (req: Request, res: Response) => {
    const status = await getSubscriptionStatus(req.userId!);
    res.json(status);
  }),
);

export default router;
