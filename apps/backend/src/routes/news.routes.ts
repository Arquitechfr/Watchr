import { Router, Request, Response } from "express";
import { getNews, getNewsSourcesByLocale, getDefaultSourceId, type NewsArticle } from "../services/news.service.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { normalizeLocale, SupportedLocale } from "../i18n/translations.js";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getTrackedShowTitles } from "../services/tracking.service.js";

const router: Router = Router();

function resolveLocale(req: Request): SupportedLocale {
  const queryLocale = typeof req.query.locale === "string" ? req.query.locale : undefined;
  return normalizeLocale(queryLocale ?? req.language);
}

router.get(
  "/sources",
  asyncHandler(async (req: Request, res: Response) => {
    const locale = resolveLocale(req);
    const sources = await getNewsSourcesByLocale(locale);
    res.json(sources);
  }),
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const locale = resolveLocale(req);
    const sourceId = typeof req.query.source === "string" ? req.query.source : await getDefaultSourceId(locale);
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 30;
    const articles = await getNews(sourceId ?? undefined, Number.isNaN(limit) ? 30 : limit, locale);
    res.json(articles);
  }),
);

router.get(
  "/filtered",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const locale = resolveLocale(req);
    const sourceId = typeof req.query.source === "string" ? req.query.source : await getDefaultSourceId(locale);
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 50;
    const articles = await getNews(sourceId ?? undefined, Number.isNaN(limit) ? 50 : limit, locale);

    const trackedTitles = await getTrackedShowTitles(req.userId!);
    if (trackedTitles.length === 0) {
      res.json([]);
      return;
    }

    const filtered = filterNewsByTrackedShows(articles, trackedTitles);
    res.json(filtered);
  }),
);

function filterNewsByTrackedShows(articles: NewsArticle[], trackedTitles: string[]): NewsArticle[] {
  const lowerTitles = trackedTitles.map((t) => t.toLowerCase());
  return articles.filter((article) => {
    const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
    return lowerTitles.some((title) => text.includes(title));
  });
}

export default router;
