import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../lib/redis.js";
import { translate } from "../i18n/index.js";

function createApiRateLimiter({
  windowMs,
  max,
  errorCode,
}: {
  windowMs: number;
  max: number;
  errorCode: string;
}): RateLimitRequestHandler {
  return rateLimit({
    store: new RedisStore({
      // ioredis .call() accepts (command: string, ...args) and returns a promise.
      // rate-limit-redis expects (...args: string[]) => Promise<RedisReply>.
      sendCommand: (...args: string[]) =>
        redisClient.call(args[0], args.slice(1)) as Promise<boolean | number | string | (boolean | number | string)[]>,
    }),
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Invariant: apiKeyAuth runs BEFORE this limiter in the middleware chain.
    // It either injects req.apiUser (next()) or returns 401/403 (chain stops).
    // The "unknown" fallback is defensive only and should never be reached.
    keyGenerator: (req: Request): string => req.apiUser?.keyId ?? "unknown",
    handler: (req: Request, res: Response) => {
      const lang = req.language;
      res.status(429).json({
        error: {
          code: errorCode,
          message: translate(errorCode, lang) ?? "Too many API requests. Try again later.",
        },
      });
    },
  });
}

export const readLimiter = createApiRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  errorCode: "TOO_MANY_API_READ_REQUESTS",
});

export const writeLimiter = createApiRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  errorCode: "TOO_MANY_API_WRITE_REQUESTS",
});
