import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { validateRequest } from "../validators/validateRequest.js";
import { userIdParamSchema, blockListQuerySchema } from "../validators/userBlock.validator.js";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../services/userBlock.service.js";

const router: Router = Router();

router.use(requireAuth);

const blockRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  errorCode: "TOO_MANY_BLOCK_REQUESTS",
});

router.post(
  "/:userId",
  blockRateLimiter,
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await blockUser(req.userId!, userId);
    res.status(201).json(result);
  }),
);

router.delete(
  "/:userId",
  blockRateLimiter,
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await unblockUser(req.userId!, userId);
    res.json(result);
  }),
);

router.get(
  "/",
  validateRequest(undefined, blockListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { page: string; limit: string };
    const result = await getBlockedUsers(
      req.userId!,
      Number(query.page) || 1,
      Number(query.limit) || 20,
    );
    res.json(result);
  }),
);

export default router;
