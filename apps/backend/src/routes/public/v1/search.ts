import { Router, Request, Response } from "express";
import { apiKeyAuth } from "../../../middleware/apiKeyAuth.js";
import { readLimiter } from "../../../middleware/apiRateLimiter.js";
import { validateRequest } from "../../../validators/validateRequest.js";
import { asyncHandler } from "../../../lib/asyncHandler.js";
import { searchShows } from "../../../services/show.service.js";
import { searchSchema } from "../../../validators/show.validator.js";

const router: Router = Router();

router.get(
  "/",
  apiKeyAuth("read"),
  readLimiter,
  validateRequest(undefined, searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string };
    const results = await searchShows(q, req.language);
    res.json({ results });
  }),
);

export default router;
