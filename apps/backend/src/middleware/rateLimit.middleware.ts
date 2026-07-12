import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";
import { translate } from "../i18n/index.js";

interface CreateRateLimiterOptions {
  windowMs: number;
  max: number;
  errorCode: string;
}

export function createRateLimiter({
  windowMs,
  max,
  errorCode,
}: CreateRateLimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => req.userId ?? req.ip ?? "unknown",
    handler: (req: Request, res: Response) => {
      const lang = req.language;
      res.status(429).json({
        error: {
          code: errorCode,
          message: translate(errorCode, lang) ?? "Too many requests. Try again later.",
        },
      });
    },
  });
}
