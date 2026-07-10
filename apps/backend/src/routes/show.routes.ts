import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getShowDetails, getSeasonDetails, searchShows, getDiscoverSections, getDiscoverSectionItems } from "../services/show.service.js";
import { aiSearchShows } from "../services/aiSearch.service.js";
import { getRecommendations } from "../services/recommendation.service.js";
import { getMoodRecommendations } from "../services/aiMood.service.js";
import { getSimilarShows } from "../services/aiSimilarShows.service.js";
import { getOnboardingSuggestions } from "../services/aiOnboarding.service.js";
import { semanticSearchShows } from "../services/aiSemanticSearch.service.js";
import { getEpisodeSummary } from "../services/aiEpisodeSummary.service.js";
import { getEnrichedTags } from "../services/aiEnrichedTags.service.js";
import { searchSchema, tmdbIdParamSchema, seasonParamSchema, discoverSectionParamSchema, discoverSectionQuerySchema } from "../validators/show.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { cacheResponse } from "../middleware/cache.middleware.js";
import { Show } from "../models/show.model.js";

const router: Router = Router();

router.use(requireAuth);

router.get(
  "/search",
  validateRequest(undefined, searchSchema),
  cacheResponse(3600),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string };
    const results = await searchShows(q, req.language);
    res.json({ results });
  }),
);

router.get(
  "/ai-search",
  validateRequest(undefined, searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string };
    const results = await aiSearchShows(q, req.language);
    res.json(results);
  }),
);

router.get(
  "/semantic-search",
  validateRequest(undefined, searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q: string };
    const results = await semanticSearchShows(q, req.language);
    res.json(results);
  }),
);

router.get(
  "/recommendations",
  asyncHandler(async (req: Request, res: Response) => {
    const results = await getRecommendations(req.userId!, req.language);
    res.json(results);
  }),
);

router.get(
  "/mood-recommendations",
  asyncHandler(async (req: Request, res: Response) => {
    const mood = typeof req.query.mood === "string" ? req.query.mood : "happy";
    const results = await getMoodRecommendations(mood, req.language);
    res.json(results);
  }),
);

router.post(
  "/onboarding-suggestions",
  asyncHandler(async (req: Request, res: Response) => {
    const { genres, mood, type } = req.body as {
      genres?: string[];
      mood?: string;
      type?: "tv" | "movie" | "both";
    };
    const results = await getOnboardingSuggestions({ genres, mood, type }, req.language);
    res.json(results);
  }),
);

router.get(
  "/discover",
  cacheResponse(259200),
  asyncHandler(async (req: Request, res: Response) => {
    const results = await getDiscoverSections(req.language);
    res.json(results);
  }),
);

router.get(
  "/discover/:sectionId",
  validateRequest(discoverSectionQuerySchema, undefined, discoverSectionParamSchema),
  cacheResponse(3600),
  asyncHandler(async (req: Request, res: Response) => {
    const { sectionId } = req.params;
    const page = Number(req.query.page) || 1;
    const results = await getDiscoverSectionItems(sectionId as any, page, req.language);
    res.json(results);
  }),
);

router.get(
  "/:tmdbId",
  validateRequest(undefined, undefined, tmdbIdParamSchema),
  cacheResponse(300),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params;
    const show = await getShowDetails(Number(tmdbId), req.language);
    res.json(show);
  }),
);

router.get(
  "/:tmdbId/seasons/:seasonNumber",
  validateRequest(undefined, undefined, seasonParamSchema),
  cacheResponse(60),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId, seasonNumber } = req.params;
    const season = await getSeasonDetails(Number(tmdbId), Number(seasonNumber), req.language);
    res.json(season);
  }),
);

router.get(
  "/:tmdbId/seasons/:seasonNumber/episodes/:episodeNumber/summary",
  validateRequest(undefined, undefined, seasonParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId, seasonNumber, episodeNumber } = req.params;
    const summary = await getEpisodeSummary(
      Number(tmdbId),
      Number(seasonNumber),
      Number(episodeNumber),
      req.language,
    );
    res.json(summary);
  }),
);

router.get(
  "/:tmdbId/tags",
  validateRequest(undefined, undefined, tmdbIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params;
    const type = typeof req.query.type === "string" ? (req.query.type as "tv" | "movie") : "tv";
    const result = await getEnrichedTags(Number(tmdbId), type, req.language);
    res.json(result);
  }),
);

router.get(
  "/:tmdbId/similar",
  validateRequest(undefined, undefined, tmdbIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tmdbId } = req.params;
    const show = await Show.findOne({ tmdbId: Number(tmdbId) }).select("_id").lean();
    if (!show) {
      res.json({ shows: [], source: "fallback" });
      return;
    }
    const results = await getSimilarShows(show._id.toString(), req.language);
    res.json(results);
  }),
);

export default router;
