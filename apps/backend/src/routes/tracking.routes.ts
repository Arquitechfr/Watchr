import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { ApiError } from "../middleware/error.middleware.js";
import {
  addToWatchlistByTmdb,
  addToWatchlistBatch,
  deleteTracking,
  getTrackedTmdbIds,
  getTrackingEntry,
  getUnwatched,
  listLibrary,
  listTracking,
  markEpisodesUpTo,
  toggleDropped,
  toggleEpisode,
  upsertTracking,
} from "../services/tracking.service.js";
import {
  addToWatchlistByTmdbParamsSchema,
  addToWatchlistByTmdbSchema,
  batchAddToWatchlistSchema,
  librarySchema,
  listTrackingSchema,
  markUpToSchema,
  toggleDroppedSchema,
  toggleEpisodeSchema,
  unwatchedSchema,
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
    const result = await listTracking(req.userId!, page, limit, status, req.language);
    res.json(result);
  }),
);

router.get(
  "/unwatched",
  validateRequest(undefined, unwatchedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.query as { type?: "tv" | "movie" };
    const result = await getUnwatched(req.userId!, type, req.language);
    res.json(result);
  }),
);

router.get(
  "/library",
  validateRequest(undefined, librarySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, type } = req.query as unknown as {
      page: number;
      limit: number;
      type?: "tv" | "movie";
    };
    const result = await listLibrary(req.userId!, page, limit, type, req.language);
    res.json(result);
  }),
);

router.get(
  "/tmdb-ids",
  asyncHandler(async (req: Request, res: Response) => {
    const tmdbIds = await getTrackedTmdbIds(req.userId!);
    res.json({ tmdbIds });
  }),
);

router.post(
  "/by-tmdb/:tmdbId",
  validateRequest(addToWatchlistByTmdbSchema, undefined, addToWatchlistByTmdbParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params;
    const { type } = req.body as { type: "tv" | "movie" };
    const entry = await addToWatchlistByTmdb(req.userId!, Number(tmdbId), type, req.language);
    res.status(201).json(entry);
  }),
);

router.post(
  "/batch-by-tmdb",
  validateRequest(batchAddToWatchlistSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { items } = req.body as { items: { tmdbId: number; type: "tv" | "movie" }[] };
    const result = await addToWatchlistBatch(req.userId!, items, req.language);
    res.json(result);
  }),
);

router.get(
  "/:showId",
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const entry = await getTrackingEntry(req.userId!, showId);
    if (!entry) {
      throw new ApiError(404, "TRACKING_NOT_FOUND", "Tracking entry not found");
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

router.patch(
  "/:showId/dropped",
  validateRequest(toggleDroppedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const { dropped } = req.body;
    const entry = await toggleDropped(req.userId!, showId, dropped);
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
