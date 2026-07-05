import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getNews, getNewsSourcesByLocale, getDefaultSourceId } from "../services/news.service.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/sources",
  asyncHandler(async (req: Request, res: Response) => {
    const sources = await getNewsSourcesByLocale(req.language ?? "en");
    res.json(sources);
  }),
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const sourceId = typeof req.query.source === "string" ? req.query.source : await getDefaultSourceId(req.language ?? "en");
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 30;
    const articles = await getNews(sourceId ?? undefined, Number.isNaN(limit) ? 30 : limit);
    res.json(articles);
  }),
);

export default router;
