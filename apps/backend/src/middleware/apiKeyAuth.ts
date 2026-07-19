import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { ApiKey, ApiKeyScope } from "../models/ApiKey.js";
import { ApiError } from "./error.middleware.js";

/**
 * Multi-app isolation note:
 * This backend is Watchr-only. There is no multi-app/tenant isolation pattern
 * (no Kloopa/Falar/StoryLine in this codebase). All ApiKey records are scoped
 * to Watchr users via the `userId` ref. No cross-app data leakage is possible.
 */

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Factory that returns an API key authentication middleware.
 *
 * - Without argument: validates that the key exists and is not revoked,
 *   injects `req.apiUser`. No scope check. Used for /mcp where scope
 *   is verified per-tool.
 * - With argument: additionally verifies that `requiredScope` is in
 *   `key.scopes`. Used for public v1 routes.
 *
 * Invariant: this middleware must run BEFORE any rate limiter that
 * depends on `req.apiUser.keyId`. If auth fails, it calls next(ApiError)
 * and the rate limiter never executes.
 */
export function apiKeyAuth(requiredScope?: ApiKeyScope) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      next(new ApiError(401, "INVALID_API_KEY", "Missing or malformed Authorization header"));
      return;
    }

    const token = header.slice(7).trim();
    if (!token.startsWith("wtc_")) {
      next(new ApiError(401, "INVALID_API_KEY", "Invalid API key format"));
      return;
    }

    const keyHash = hashToken(token);
    const key = await ApiKey.findOne({ keyHash }).lean();

    if (!key) {
      next(new ApiError(401, "INVALID_API_KEY", "API key not found"));
      return;
    }

    if (key.revokedAt !== null) {
      next(new ApiError(401, "INVALID_API_KEY", "API key has been revoked"));
      return;
    }

    if (requiredScope && !key.scopes.includes(requiredScope)) {
      next(new ApiError(403, "INSUFFICIENT_SCOPE", `This API key does not have the '${requiredScope}' scope`));
      return;
    }

    req.apiUser = {
      userId: key.userId.toString(),
      keyId: key._id.toString(),
      scopes: key.scopes,
    };

    // Fire-and-forget: update lastUsedAt without blocking the response
    ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

    next();
  };
}
