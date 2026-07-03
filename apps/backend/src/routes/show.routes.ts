import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getShowDetails, getSeasonDetails, searchShows } from "../services/show.service.js";
import { searchSchema, tmdbIdParamSchema, seasonParamSchema } from "../validators/show.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { cacheResponse } from "../middleware/cache.middleware.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/search",
  validateRequest(undefined, searchSchema),
  cacheResponse(3600),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string };
    const results = await searchShows(q);
    res.json(results);
  }),
);

router.get(
  "/:tmdbId",
  validateRequest(undefined, undefined, tmdbIdParamSchema),
  cacheResponse(300),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params;
    const show = await getShowDetails(Number(tmdbId));
    res.json(show);
  }),
);

router.get(
  "/:tmdbId/seasons/:seasonNumber",
  validateRequest(undefined, undefined, seasonParamSchema),
  cacheResponse(300),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId, seasonNumber } = req.params;
    const season = await getSeasonDetails(Number(tmdbId), Number(seasonNumber));
    res.json(season);
  }),
);

export default router;
