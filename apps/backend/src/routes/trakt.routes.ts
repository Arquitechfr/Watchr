import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ApiError } from "../middleware/error.middleware.js";
import { env } from "../config/env.js";
import {
  getTraktAuthUrl,
  linkTraktAccount,
  unlinkTraktAccount,
  getTraktLink,
  toggleTraktAutoSync,
  syncFromTrakt,
} from "../services/trakt.service.js";
import { z } from "zod";
import { validateRequest } from "../validators/validateRequest.js";

const router: Router = Router();

const traktCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().optional(),
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
    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }
    const userId = state;
    if (!userId) {
      res.status(400).send("Missing state parameter");
      return;
    }
    try {
      const link = await linkTraktAccount(userId, code);
      res.redirect(302, `watchr://trakt/callback?username=${encodeURIComponent(link.traktUsername)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
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
      lastSyncAt: link.lastSyncAt,
    });
  }),
);

router.post(
  "/sync",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await syncFromTrakt(req.userId!);
    res.status(202).json(result);
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
    });
  }),
);

export default router;
