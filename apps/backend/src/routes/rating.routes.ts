import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { deleteRating, listRatingsForShow, upsertRating } from "../services/rating.service.js";
import { upsertRatingSchema } from "../validators/rating.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: Router = Router();

router.use(requireAuth);

router.post(
  "/",
  validateRequest(upsertRatingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rating = await upsertRating(req.userId!, req.body);
    res.json(rating);
  }),
);

router.get(
  "/:showId",
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const result = await listRatingsForShow(req.userId!, showId);
    res.json(result);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await deleteRating(req.userId!, id);
    res.status(204).send();
  }),
);

export default router;
