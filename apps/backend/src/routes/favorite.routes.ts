import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { validateRequest } from "../validators/validateRequest.js";
import { favoriteParamsSchema, favoriteQuerySchema } from "../validators/favorite.validator.js";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteShowIds,
} from "../services/favorite.service.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/ids",
  asyncHandler(async (req: Request, res: Response) => {
    const ids = await getFavoriteShowIds(req.userId!);
    res.json({ showIds: ids });
  }),
);

router.get(
  "/",
  validateRequest(undefined, favoriteQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, page, limit } = req.query as unknown as {
      type?: "tv" | "movie";
      page: number;
      limit: number;
    };
    const result = await listFavorites(req.userId!, type, page, limit, req.language);
    res.json(result);
  }),
);

router.post(
  "/:showId",
  validateRequest(undefined, undefined, favoriteParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const result = await addFavorite(req.userId!, showId);
    res.status(201).json(result);
  }),
);

router.delete(
  "/:showId",
  validateRequest(undefined, undefined, favoriteParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    await removeFavorite(req.userId!, showId);
    res.status(204).send();
  }),
);

export default router;
