import { Router, Request, Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { getImportQueue } from "../workers/import.worker.js";
import { ImportJob } from "../models/importJob.model.js";
import { PendingImportReview } from "../models/pendingImportReview.model.js";
import { jobIdParamSchema, reviewIdParamSchema, resolveReviewBodySchema } from "../validators/import.validator.js";
import { validateRequest } from "../validators/validateRequest.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ApiError } from "../middleware/error.middleware.js";
import { translate } from "../i18n/index.js";
import { detectSource } from "../services/import/parserRegistry.js";
import { ImportSource } from "../services/import/types.js";
import { resolvePendingReview } from "../services/import/tvtime/tvtimeImport.service.js";

const router: Router = Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
});

const importRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = req.language;
    res.status(429).json({
      error: { code: "TOO_MANY_IMPORT_REQUESTS", message: translate("TOO_MANY_IMPORT_REQUESTS", lang) ?? "Too many import requests" },
    });
  },
});

router.post(
  "/upload",
  importRateLimiter,
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(400, "MISSING_FILE", "No file uploaded");
    }

    const sourceParam = (req.body.source ?? req.query.source) as string | undefined;
    let source: ImportSource = "unknown";
    if (sourceParam && ["tvtime", "trakt", "imdb", "letterboxd", "watchr"].includes(sourceParam)) {
      source = sourceParam as ImportSource;
    } else {
      source = detectSource(req.file.path);
    }

    const job = await ImportJob.create({
      userId: req.userId,
      status: "pending",
      source,
      sourceFile: req.file.path,
    });

    await getImportQueue().add(
      "import",
      { userId: req.userId, jobId: job._id.toString(), sourceFile: req.file.path, source },
      { jobId: `import-${job._id.toString()}`, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );

    res.status(202).json({ jobId: job._id.toString(), source });
  }),
);

router.get(
  "/:jobId",
  validateRequest(undefined, undefined, jobIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = await ImportJob.findById(jobId).lean();
    if (!job) {
      throw new ApiError(404, "JOB_NOT_FOUND", "Import job not found");
    }
    if (job.userId.toString() !== req.userId) {
      throw new ApiError(403, "FORBIDDEN", "Not authorized to view this job");
    }
    res.json({
      id: job._id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  }),
);

router.get(
  "/:jobId/errors",
  validateRequest(undefined, undefined, jobIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = await ImportJob.findById(jobId).lean();
    if (!job) {
      throw new ApiError(404, "JOB_NOT_FOUND", "Import job not found");
    }
    if (job.userId.toString() !== req.userId) {
      throw new ApiError(403, "FORBIDDEN", "Not authorized to view this job");
    }
    res.json({
      errors: job.errorLog,
      total: job.errorLog.length,
    });
  }),
);

router.get(
  "/:jobId/review",
  validateRequest(undefined, undefined, jobIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = await ImportJob.findById(jobId).lean();
    if (!job) {
      throw new ApiError(404, "JOB_NOT_FOUND", "Import job not found");
    }
    if (job.userId.toString() !== req.userId) {
      throw new ApiError(403, "FORBIDDEN", "Not authorized to view this job");
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const [reviews, total] = await Promise.all([
      PendingImportReview.find({ importJobId: job._id, status: "pending" })
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PendingImportReview.countDocuments({ importJobId: job._id, status: "pending" }),
    ]);

    res.json({
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

router.post(
  "/:jobId/review/:reviewId/resolve",
  validateRequest(resolveReviewBodySchema, undefined, reviewIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId, reviewId } = req.params;
    const job = await ImportJob.findById(jobId).lean();
    if (!job) {
      throw new ApiError(404, "JOB_NOT_FOUND", "Import job not found");
    }
    if (job.userId.toString() !== req.userId) {
      throw new ApiError(403, "FORBIDDEN", "Not authorized to view this job");
    }

    const { tmdbId, skip } = req.body;
    await resolvePendingReview(reviewId, req.userId!, tmdbId ?? null, skip === true);

    res.json({ resolved: true });
  }),
);

export default router;
