import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware.js";
import { verifyAccessToken } from "../services/auth.service.js";
import { translate, normalizeLocale } from "../i18n/index.js";
import { User } from "../models/user.model.js";

const CACHE_TTL_MS = 60_000;
const banCache = new Map<string, { isBanned: boolean; suspendedUntil: Date | null; cachedAt: number }>();

export function invalidateUserBanCache(userId: string): void {
  banCache.delete(userId);
}

async function checkUserBanStatus(userId: string): Promise<void> {
  const now = Date.now();
  const cached = banCache.get(userId);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    if (cached.isBanned) {
      throw new ApiError(403, "ACCOUNT_BANNED", "This account has been banned");
    }
    if (cached.suspendedUntil && cached.suspendedUntil.getTime() > now) {
      throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account is suspended");
    }
    return;
  }

  const user = await User.findById(userId).select("isBanned suspendedUntil").lean();
  if (!user) {
    throw new ApiError(401, "INVALID_TOKEN", "User not found");
  }

  banCache.set(userId, {
    isBanned: user.isBanned,
    suspendedUntil: user.suspendedUntil,
    cachedAt: now,
  });

  if (user.isBanned) {
    throw new ApiError(403, "ACCOUNT_BANNED", "This account has been banned");
  }
  if (user.suspendedUntil && user.suspendedUntil.getTime() > now) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account is suspended");
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
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
    await checkUserBanStatus(payload.sub);
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
      return;
    }
    next(new ApiError(401, "INVALID_TOKEN", translate("INVALID_TOKEN", lang)));
  }
}
