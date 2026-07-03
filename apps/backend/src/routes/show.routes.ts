import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getShowDetails, searchShows } from "../services/show.service.js";
import { searchSchema, tmdbIdParamSchema } from "../validators/show.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/search",
  validateRequest(undefined, searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string };
    const results = await searchShows(q);
    res.json(results);
  }),
);

router.get(
  "/:tmdbId",
  validateRequest(undefined, undefined, tmdbIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params;
    const show = await getShowDetails(Number(tmdbId));
    res.json(show);
  }),
);

export default router;
