import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { validateRequest } from "../../validators/validateRequest.js";
import { captureErrorSchema } from "../../validators/admin/adminError.validator.js";
import { captureError } from "../../services/errorTracking.service.js";
import { verifyAccessToken } from "../../services/auth.service.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

const router: Router = Router();

const errorRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many error reports, please slow down." } },
});

router.post(
  "/errors",
  errorRateLimit,
  validateRequest(captureErrorSchema),
  asyncHandler(async (req: Request, res: Response) => {
    let userContext = req.body.userContext;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7).trim();
        const payload = verifyAccessToken(token);
        userContext = {
          userId: payload.sub,
          ...userContext,
        };
      } catch {
        // Invalid token — ignore, proceed without userContext
      }
    }

    const result = await captureError({
      type: req.body.type,
      message: req.body.message,
      stackTrace: req.body.stackTrace,
      platform: req.body.platform,
      severity: req.body.severity,
      appVersion: req.body.appVersion,
      deviceInfo: req.body.deviceInfo,
      breadcrumbs: req.body.breadcrumbs,
      userContext,
      extra: req.body.extra,
    });

    res.status(201).json(result);
  }),
);

export default router;
