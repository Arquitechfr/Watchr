import { Router, Request, Response } from "express";
import { runPublicChecks } from "../../services/status.service.js";
import { logError } from "../../lib/logger.js";

const router: Router = Router();

let cache: { data: Record<string, unknown>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

router.get("/status", async (_req: Request, res: Response) => {
  try {
    if (cache && cache.expiresAt > Date.now()) {
      return res.json({ ...cache.data, cached: true });
    }

    const services = await runPublicChecks();
    const overallStatus = services.every((s) => s.status === "operational")
      ? "operational"
      : services.some((s) => s.status === "down")
        ? "down"
        : "degraded";

    const data = {
      overallStatus,
      timestamp: new Date().toISOString(),
      services: services.map((s) => ({
        name: s.name,
        status: s.status,
        latencyMs: s.latencyMs,
      })),
    };

    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return res.json({ ...data, cached: false });
  } catch (err) {
    logError("status", "public fetch error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export function invalidateStatusCache(): void {
  cache = null;
}

export default router;
