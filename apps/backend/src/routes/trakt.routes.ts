import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ApiError } from "../middleware/error.middleware.js";
import { env } from "../config/env.js";
import { log, logError } from "../lib/logger.js";
import {
  getTraktAuthUrl,
  linkTraktAccount,
  unlinkTraktAccount,
  getTraktLink,
  toggleTraktAutoSync,
  syncFromTrakt,
  syncToTrakt,
  setTraktSyncDirection,
  exchangeTraktCode,
  getTraktUsername,
} from "../services/trakt.service.js";
import { z } from "zod";
import { validateRequest } from "../validators/validateRequest.js";

const router: Router = Router();

const traktCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().optional(),
});

const traktSyncDirectionSchema = z.object({
  direction: z.enum(["from", "both"]),
});

const traktSyncRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  errorCode: "TOO_MANY_TRAKT_SYNC_REQUESTS",
});

router.get(
  "/auth-url",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!env.TRAKT_CLIENT_ID) {
      throw new ApiError(400, "TRAKT_NOT_CONFIGURED", "Trakt OAuth is not configured");
    }
    const state = req.userId!;
    const url = getTraktAuthUrl(state);
    res.json({ url });
  }),
);

router.get(
  "/callback",
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query as { code?: string; state?: string };
    log("TraktCallback", "received", {
      query: req.query,
      originalUrl: req.originalUrl,
      headers: { host: req.headers.host, referer: req.headers.referer },
    });
    if (!code) {
      logError("TraktCallback", "missing code", "No code in query", { query: req.query });
      res.status(400).send("Missing authorization code");
      return;
    }
    const userId = state;
    if (!userId) {
      log("TraktCallback", "no state — assuming Trakt test authorize", { code });
      try {
        const tokens = await exchangeTraktCode(code);
        const username = await getTraktUsername(tokens.access_token);
        log("TraktCallback", "test authorize success", { username });
        res.status(200).send(
          `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trakt OAuth Test</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.container{background:#1a1a1a;border-radius:12px;max-width:500px;width:100%;padding:40px;text-align:center}.icon{font-size:3rem;margin-bottom:16px}h1{font-size:1.5rem;margin-bottom:8px}.detail{color:#888;margin-top:12px;font-size:0.9rem}</style></head><body><div class="container"><div class="icon">&#9989;</div><h1>Trakt OAuth Test Successful</h1><p>Redirect URI and credentials are valid.</p><p class="detail">Authenticated as: <strong>${username}</strong></p></div></body></html>`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logError("TraktCallback", "test authorize failed", message, { code });
        res.status(200).send(
          `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trakt OAuth Test</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.container{background:#1a1a1a;border-radius:12px;max-width:500px;width:100%;padding:40px;text-align:center}.icon{font-size:3rem;margin-bottom:16px}h1{font-size:1.5rem;margin-bottom:8px}.detail{color:#888;margin-top:12px;font-size:0.9rem}</style></head><body><div class="container"><div class="icon">&#10060;</div><h1>Trakt OAuth Test Failed</h1><p class="detail">${message}</p></div></body></html>`,
        );
      }
      return;
    }
    try {
      const link = await linkTraktAccount(userId, code);
      res.redirect(302, `watchr://trakt/callback?username=${encodeURIComponent(link.traktUsername)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logError("TraktCallback", "link failed", message, { userId });
      res.redirect(302, `watchr://trakt/callback?error=${encodeURIComponent(message)}`);
    }
  }),
);

router.post(
  "/callback",
  requireAuth,
  validateRequest(traktCallbackSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body as z.infer<typeof traktCallbackSchema>;
    const link = await linkTraktAccount(req.userId!, code);
    res.json({
      traktUsername: link.traktUsername,
      autoSync: link.autoSync,
      syncDirection: link.syncDirection,
      lastSyncAt: link.lastSyncAt,
      lastSyncToTraktAt: link.lastSyncToTraktAt,
    });
  }),
);

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const link = await getTraktLink(req.userId!);
    if (!link) {
      res.json({ linked: false });
      return;
    }
    res.json({
      linked: true,
      traktUsername: link.traktUsername,
      autoSync: link.autoSync,
      syncDirection: link.syncDirection,
      lastSyncAt: link.lastSyncAt,
      lastSyncToTraktAt: link.lastSyncToTraktAt,
    });
  }),
);

router.post(
  "/sync",
  requireAuth,
  traktSyncRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await syncFromTrakt(req.userId!);
    res.status(202).json(result);
  }),
);

router.post(
  "/sync-to-trakt",
  requireAuth,
  traktSyncRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await syncToTrakt(req.userId!);
    res.json(result);
  }),
);

router.put(
  "/sync-direction",
  requireAuth,
  validateRequest(traktSyncDirectionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { direction } = req.body as z.infer<typeof traktSyncDirectionSchema>;
    const link = await setTraktSyncDirection(req.userId!, direction);
    res.json({
      traktUsername: link.traktUsername,
      autoSync: link.autoSync,
      syncDirection: link.syncDirection,
      lastSyncAt: link.lastSyncAt,
      lastSyncToTraktAt: link.lastSyncToTraktAt,
    });
  }),
);

router.delete(
  "/unlink",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await unlinkTraktAccount(req.userId!);
    res.json({ success: true });
  }),
);

router.put(
  "/auto-sync",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const enabled = Boolean(req.body?.enabled);
    const link = await toggleTraktAutoSync(req.userId!, enabled);
    res.json({
      traktUsername: link!.traktUsername,
      autoSync: link!.autoSync,
      syncDirection: link!.syncDirection,
      lastSyncAt: link!.lastSyncAt,
      lastSyncToTraktAt: link!.lastSyncToTraktAt,
    });
  }),
);

export default router;
