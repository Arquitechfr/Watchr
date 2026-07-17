import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { validateRequest } from "../validators/validateRequest.js";
import {
  userIdParamSchema,
  activityVisibilitySchema,
  activityFeedQuerySchema,
  searchQuerySchema,
} from "../validators/social.validator.js";
import {
  followUser,
  unfollowUser,
  getFollowStatus,
  listFollowers,
  listFollowing,
  updateActivityVisibility,
  getPublicProfile,
  searchUsers,
  getFriendsActivityFeed,
} from "../services/social.service.js";

const router: Router = Router();

router.use(requireAuth);

const followRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  errorCode: "TOO_MANY_FOLLOW_REQUESTS",
});

const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  errorCode: "TOO_MANY_SEARCH_REQUESTS",
});

router.post(
  "/follow/:userId",
  followRateLimiter,
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await followUser(req.userId!, userId);
    res.status(201).json(result);
  }),
);

router.delete(
  "/follow/:userId",
  followRateLimiter,
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    await unfollowUser(req.userId!, userId);
    res.status(204).send();
  }),
);

router.get(
  "/follow/:userId/status",
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await getFollowStatus(req.userId!, userId);
    res.json(result);
  }),
);

router.get(
  "/followers/:userId",
  validateRequest(undefined, activityFeedQuerySchema, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const query = req.query as { page: string; limit: string };
    const result = await listFollowers(
      userId,
      Number(query.page) || 1,
      Number(query.limit) || 20,
    );
    res.json(result);
  }),
);

router.get(
  "/following/:userId",
  validateRequest(undefined, activityFeedQuerySchema, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const query = req.query as { page: string; limit: string };
    const result = await listFollowing(
      userId,
      Number(query.page) || 1,
      Number(query.limit) || 20,
    );
    res.json(result);
  }),
);

router.get(
  "/users/:username",
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;
    const result = await getPublicProfile(username, req.userId!, req.language);
    res.json(result);
  }),
);

router.get(
  "/search",
  searchRateLimiter,
  validateRequest(undefined, searchQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { q: string; page: string; limit: string };
    const result = await searchUsers(
      query.q,
      req.userId!,
      Number(query.page) || 1,
      Number(query.limit) || 10,
    );
    res.json(result);
  }),
);

router.get(
  "/activity",
  validateRequest(undefined, activityFeedQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { page: string; limit: string };
    const result = await getFriendsActivityFeed(
      req.userId!,
      Number(query.page) || 1,
      Number(query.limit) || 20,
    );
    res.json(result);
  }),
);

router.patch(
  "/me/activity-visibility",
  validateRequest(activityVisibilitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { activityVisibility } = req.body;
    const result = await updateActivityVisibility(req.userId!, activityVisibility);
    res.json(result);
  }),
);

export default router;
