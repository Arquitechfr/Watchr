import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import {
  deleteTracking,
  getTrackingEntry,
  listTracking,
  markEpisodesUpTo,
  toggleEpisode,
  upsertTracking,
} from "../services/tracking.service.js";
import {
  listTrackingSchema,
  markUpToSchema,
  toggleEpisodeSchema,
  upsertTrackingSchema,
} from "../validators/tracking.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/",
  validateRequest(undefined, listTrackingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status } = req.query as unknown as {
      page: number;
      limit: number;
      status?: import("../models/watchEntry.model.js").WatchStatus;
    };
    const result = await listTracking(req.userId!, page, limit, status);
    res.json(result);
  }),
);

router.get(
  "/:showId",
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const entry = await getTrackingEntry(req.userId!, showId);
    if (!entry) {
      res.status(404).json({ error: { code: "TRACKING_NOT_FOUND", message: "Tracking entry not found" } });
      return;
    }
    res.json(entry);
  }),
);

router.post(
  "/:showId",
  validateRequest(upsertTrackingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const entry = await upsertTracking(req.userId!, showId, req.body);
    res.json(entry);
  }),
);

router.patch(
  "/:showId/episodes",
  validateRequest(toggleEpisodeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const { season, episode, watched } = req.body;
    const entry = await toggleEpisode(req.userId!, showId, season, episode, watched);
    res.json(entry);
  }),
);

router.post(
  "/:showId/mark-up-to",
  validateRequest(markUpToSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const { season, episode, includePrevious } = req.body;
    const entry = await markEpisodesUpTo(req.userId!, showId, season, episode, includePrevious);
    res.json(entry);
  }),
);

router.delete(
  "/:showId",
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    await deleteTracking(req.userId!, showId);
    res.status(204).send();
  }),
);

export default router;
