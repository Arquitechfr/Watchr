import { Router, Request, Response } from "express";
import { getNews, getNewsSourcesByLocale, getDefaultSourceId } from "../services/news.service.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { normalizeLocale, SupportedLocale } from "../i18n/translations.js";

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
    const articles = await getNews(sourceId ?? undefined, Number.isNaN(limit) ? 30 : limit);
    res.json(articles);
  }),
);

export default router;
