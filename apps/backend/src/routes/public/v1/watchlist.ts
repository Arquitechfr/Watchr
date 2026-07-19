import { Router, Request, Response } from "express";
import { z } from "zod";
import { apiKeyAuth } from "../../../middleware/apiKeyAuth.js";
import { readLimiter, writeLimiter } from "../../../middleware/apiRateLimiter.js";
import { validateRequest } from "../../../validators/validateRequest.js";
import { asyncHandler } from "../../../lib/asyncHandler.js";
import {
  listTracking,
  addToWatchlistByTmdb,
  upsertTracking,
  deleteTracking,
} from "../../../services/tracking.service.js";
import {
  listTrackingSchema,
  upsertTrackingSchema,
  showIdParamSchema,
} from "../../../validators/tracking.validator.js";

const addToWatchlistBodySchema = z.object({
  tmdbId: z.number().int().positive(),
  type: z.enum(["tv", "movie"]),
});

const router: Router = Router();

router.get(
  "/",
  apiKeyAuth("read"),
  readLimiter,
  validateRequest(undefined, listTrackingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status } = req.query as unknown as {
      page: number;
      limit: number;
      status?: import("../../../models/watchEntry.model.js").WatchStatus;
    };
    const result = await listTracking(req.apiUser!.userId, page, limit, status, req.language);
    res.json(result);
  }),
);

router.post(
  "/",
  apiKeyAuth("write"),
  writeLimiter,
  validateRequest(addToWatchlistBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId, type } = req.body as { tmdbId: number; type: "tv" | "movie" };
    const entry = await addToWatchlistByTmdb(req.apiUser!.userId, tmdbId, type, req.language);
    res.status(201).json(entry);
  }),
);

router.patch(
  "/:id",
  apiKeyAuth("write"),
  writeLimiter,
  validateRequest(upsertTrackingSchema, undefined, showIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const entry = await upsertTracking(req.apiUser!.userId, id, req.body);
    res.json(entry);
  }),
);

router.delete(
  "/:id",
  apiKeyAuth("write"),
  writeLimiter,
  validateRequest(undefined, undefined, showIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await deleteTracking(req.apiUser!.userId, id);
    res.status(204).send();
  }),
);

export default router;
