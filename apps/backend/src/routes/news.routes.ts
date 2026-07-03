import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getNews, NEWS_SOURCES } from "../services/news.service.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/sources",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(NEWS_SOURCES.map((s) => ({ id: s.id, name: s.name })));
  }),
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const sourceId = typeof req.query.source === "string" ? req.query.source : "allocine-news";
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 30;
    const articles = await getNews(sourceId, Number.isNaN(limit) ? 30 : limit);
    res.json(articles);
  }),
);

export default router;
