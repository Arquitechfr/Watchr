import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getUpcomingEpisodes } from "../services/upcoming.service.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const episodes = await getUpcomingEpisodes(req.userId!, req.language);
    res.json(episodes);
  }),
);

export default router;
