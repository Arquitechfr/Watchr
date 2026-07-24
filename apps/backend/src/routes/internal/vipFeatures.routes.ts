import { Router, Request, Response } from "express";
import { getPublicVipFeatures } from "../../services/admin/adminSubscription.service.js";
import { logError } from "../../lib/logger.js";

const router: Router = Router();

let cache: { data: unknown; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateVipFeaturesCache(): void {
  cache = null;
}

router.get("/vip-features", async (_req: Request, res: Response) => {
  try {
    if (cache && cache.expiresAt > Date.now()) {
      return res.json({ features: cache.data, cached: true });
    }

    const features = await getPublicVipFeatures();
    cache = { data: features, expiresAt: Date.now() + CACHE_TTL_MS };
    return res.json({ features, cached: false });
  } catch (err) {
    logError("vip-features", "fetch error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
