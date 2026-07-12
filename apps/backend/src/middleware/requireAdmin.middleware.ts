import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { translate, normalizeLocale } from "../i18n/index.js";
import { User } from "../models/user.model.js";

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
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
    const headerLang = req.headers["accept-language"];
    const headerLocale = typeof headerLang === "string" ? normalizeLocale(headerLang) : undefined;
    if (headerLocale) {
      req.language = headerLocale as typeof req.language;
      req.preferredLanguage = headerLocale;
    } else if (payload.lang) {
      const normalized = normalizeLocale(payload.lang);
      req.language = normalized;
      req.preferredLanguage = normalized;
    }

    const user = await User.findById(payload.sub).select("role").lean();
    if (!user || user.role !== "admin") {
      next(new ApiError(403, "FORBIDDEN_ADMIN", "Admin access required"));
      return;
    }

    next();
  } catch {
    next(new ApiError(401, "INVALID_TOKEN", translate("INVALID_TOKEN", lang)));
  }
}
