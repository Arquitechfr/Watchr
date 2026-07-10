import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware.js";
import { translate } from "../i18n/index.js";
import { MobileConfig } from "../models/MobileConfig.js";

let cachedValue: boolean | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

async function isMaintenanceMode(): Promise<boolean> {
  if (cachedValue !== null && Date.now() < cacheExpiresAt) {
    return cachedValue;
  }

  const entry = await MobileConfig.findOne({ key: "maintenance_enabled" }).lean();
  const enabled = entry ? entry.value === "true" : false;

  cachedValue = enabled;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return enabled;
}

export function invalidateMaintenanceCache(): void {
  cachedValue = null;
  cacheExpiresAt = 0;
}

export async function checkMaintenance(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/admin")) {
    next();
    return;
  }

  const lang = req.language ?? "en";
  try {
    const maintenance = await isMaintenanceMode();
    if (maintenance) {
      next(new ApiError(503, "MAINTENANCE_MODE", translate("MAINTENANCE_MODE", lang) ?? "Watchr is under maintenance. Please try again later."));
      return;
    }
    next();
  } catch {
    next();
  }
}
