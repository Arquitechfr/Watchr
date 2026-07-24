import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { generateExport, ExportFormat, ExportOptions } from "../services/export.service.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ApiError } from "../middleware/error.middleware.js";
import { translate } from "../i18n/index.js";

const router: Router = Router();

const VALID_FORMATS: ExportFormat[] = ["csv", "json", "trakt", "imdb", "letterboxd"];

const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = req.language;
    res.status(429).json({
      error: { code: "TOO_MANY_EXPORT_REQUESTS", message: translate("TOO_MANY_EXPORT_REQUESTS", lang) ?? "Too many export requests" },
    });
  },
});

router.get(
  "/:format",
  exportRateLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { format } = req.params;
    if (!VALID_FORMATS.includes(format as ExportFormat)) {
      throw new ApiError(400, "INVALID_EXPORT_FORMAT", `Unsupported export format: ${format}`);
    }

    const options: ExportOptions = {
      includeRatings: req.query.includeRatings !== "false",
      includeWatchlist: req.query.includeWatchlist !== "false",
    };

    const { content, contentType, filename } = await generateExport(req.userId!, format as ExportFormat, options);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(content);
  }),
);

export default router;
