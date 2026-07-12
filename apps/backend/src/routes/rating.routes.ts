import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { deleteRating, listRatingsForShow, upsertRating } from "../services/rating.service.js";
import { upsertRatingSchema, showIdParamSchema, ratingIdParamSchema } from "../validators/rating.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { translate } from "../i18n/index.js";

const router: Router = Router();

router.use(requireAuth);

const ratingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => req.userId ?? req.ip ?? "unknown",
  handler: (req, res) => {
    const lang = req.language;
    res.status(429).json({
      error: {
        code: "TOO_MANY_RATING_REQUESTS",
        message: translate("TOO_MANY_RATING_REQUESTS", lang) ?? "Too many rating requests. Try again later.",
      },
    });
  },
});

router.post(
  "/",
  ratingRateLimiter,
  validateRequest(upsertRatingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rating = await upsertRating(req.userId!, req.body);
    res.json(rating);
  }),
);

router.get(
  "/:showId",
  validateRequest(undefined, undefined, showIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const result = await listRatingsForShow(req.userId!, showId);
    res.json(result);
  }),
);

router.delete(
  "/:id",
  validateRequest(undefined, undefined, ratingIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await deleteRating(req.userId!, id);
    res.status(204).send();
  }),
);

export default router;
