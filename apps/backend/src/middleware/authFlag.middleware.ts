import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware.js";
import { translate } from "../i18n/index.js";
import { MobileConfig } from "../models/MobileConfig.js";

let cachedValue: boolean | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

async function isAuthEnabled(): Promise<boolean> {
  if (cachedValue !== null && Date.now() < cacheExpiresAt) {
    return cachedValue;
  }

  const entry = await MobileConfig.findOne({ key: "auth_enabled" }).lean();
  const enabled = entry ? entry.value !== "false" : true;

  cachedValue = enabled;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return enabled;
}

export function invalidateAuthFlagCache(): void {
  cachedValue = null;
  cacheExpiresAt = 0;
}

export async function checkAuthEnabled(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const lang = req.language ?? "en";
  try {
    const enabled = await isAuthEnabled();
    if (!enabled) {
      next(new ApiError(503, "AUTH_DISABLED", translate("AUTH_DISABLED", lang) ?? "Authentication is temporarily disabled."));
      return;
    }
    next();
  } catch {
    next();
  }
}
