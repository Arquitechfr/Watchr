import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { validateRequest } from "../validators/validateRequest.js";
import {
  createCommentSchema,
  updateCommentSchema,
  commentParamsSchema,
  showCommentsParamsSchema,
  listCommentsQuerySchema,
  listRepliesQuerySchema,
  reactionBodySchema,
} from "../validators/comment.validator.js";
import {
  createComment,
  updateComment,
  deleteComment,
  listCommentsForShow,
  getCommentById,
  listRepliesForComment,
  getCommentCount,
  likeComment,
  unlikeComment,
  addReaction,
  removeReaction,
} from "../services/comment.service.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/show/:showId/count",
  validateRequest(undefined, listCommentsQuerySchema, showCommentsParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const query = req.query as {
      season?: string;
      episode?: string;
    };
    const episodeRef =
      query.season !== undefined && query.episode !== undefined
        ? { season: Number(query.season), episode: Number(query.episode) }
        : undefined;
    const result = await getCommentCount(showId, episodeRef);
    res.json(result);
  }),
);

router.get(
  "/:id",
  validateRequest(undefined, undefined, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const comment = await getCommentById(req.userId!, id);
    res.json(comment);
  }),
);

router.get(
  "/:id/replies",
  validateRequest(undefined, listRepliesQuerySchema, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = req.query as {
      page?: string;
      limit?: string;
    };
    const result = await listRepliesForComment(
      req.userId!,
      id,
      Number(query.page || 1),
      Number(query.limit || 20),
    );
    res.json(result);
  }),
);

router.get(
  "/show/:showId",
  validateRequest(undefined, listCommentsQuerySchema, showCommentsParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    const query = req.query as {
      season?: string;
      episode?: string;
      page?: string;
      limit?: string;
      sort?: string;
    };
    const result = await listCommentsForShow(req.userId!, showId, {
      season: query.season !== undefined ? Number(query.season) : undefined,
      episode: query.episode !== undefined ? Number(query.episode) : undefined,
      page: Number(query.page || 1),
      limit: Number(query.limit || 20),
      sort: (query.sort as "relevant" | "liked" | "replied" | "recent") || "recent",
    });
    res.json(result);
  }),
);

router.post(
  "/",
  validateRequest(createCommentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const comment = await createComment(req.userId!, req.body);
    res.status(201).json(comment);
  }),
);

router.patch(
  "/:id",
  validateRequest(updateCommentSchema, undefined, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const comment = await updateComment(req.userId!, id, req.body);
    res.json(comment);
  }),
);

router.delete(
  "/:id",
  validateRequest(undefined, undefined, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await deleteComment(req.userId!, id);
    res.status(204).send();
  }),
);

router.post(
  "/:id/like",
  validateRequest(undefined, undefined, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await likeComment(req.userId!, id);
    res.status(204).send();
  }),
);

router.delete(
  "/:id/like",
  validateRequest(undefined, undefined, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await unlikeComment(req.userId!, id);
    res.status(204).send();
  }),
);

router.post(
  "/:id/reactions",
  validateRequest(reactionBodySchema, undefined, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { emoji } = req.body;
    await addReaction(req.userId!, id, emoji);
    res.status(204).send();
  }),
);

router.post(
  "/:id/reactions/remove",
  validateRequest(reactionBodySchema, undefined, commentParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { emoji } = req.body;
    await removeReaction(req.userId!, id, emoji);
    res.status(204).send();
  }),
);

export default router;
