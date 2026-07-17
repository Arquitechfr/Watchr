import { Router, Request, Response } from "express";
import { MobileConfig } from "../../models/MobileConfig.js";

const router: Router = Router();

let cache: { data: Record<string, unknown>; descriptions: Record<string, string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateMobileConfigCache(): void {
  cache = null;
}

function parseValue(raw: string, type: string): unknown {
  switch (type) {
    case "number":
      return Number(raw);
    case "boolean":
      return raw === "true";
    case "json":
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    default:
      return raw;
  }
}

router.get("/mobile-config", async (_req: Request, res: Response) => {
  try {
    if (cache && cache.expiresAt > Date.now()) {
      return res.json({ config: cache.data, descriptions: cache.descriptions, cached: true });
    }

    const entries = await MobileConfig.find().lean();
    const config: Record<string, unknown> = {};
    const descriptions: Record<string, string> = {};
    for (const entry of entries) {
      config[entry.key] = parseValue(entry.value, entry.type);
      descriptions[entry.key] = entry.description ?? "";
    }

    cache = { data: config, descriptions, expiresAt: Date.now() + CACHE_TTL_MS };
    return res.json({ config, descriptions, cached: false });
  } catch (err) {
    console.error("[mobile-config] fetch error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
