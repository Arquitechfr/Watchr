import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { translate, normalizeLocale } from "../i18n/index.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const lang = req.language ?? "en";
  if (!header || !header.startsWith("Bearer ")) {
    next(new ApiError(401, "UNAUTHORIZED", translate("UNAUTHORIZED", lang)));
    return;
  }

  const token = header.slice(7).trim();
  if (!token) {
    next(new ApiError(401, "MISSING_TOKEN", translate("MISSING_TOKEN", lang)));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    if (payload.lang) {
      const normalized = normalizeLocale(payload.lang);
      req.language = normalized;
      req.preferredLanguage = normalized;
    }
    next();
  } catch {
    next(new ApiError(401, "INVALID_TOKEN", translate("INVALID_TOKEN", lang)));
  }
}
