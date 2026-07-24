import { Router, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { verifyRevolutWebhookSignature } from "../../lib/revolutWebhookVerify.js";
import { getRevolutSubscription, RevolutApiError } from "../../lib/revolutClient.js";
import { RevolutWebhookEvent } from "../../models/revolutWebhookEvent.model.js";
import { User } from "../../models/user.model.js";
import { logError, log } from "../../lib/logger.js";

const router = Router();

const ACTIVE_STATE = "active";
const TERMINAL_STATES = new Set(["cancelled", "finished"]);
const TRANSIENT_ERROR_STATUS = 500; // TODO validation Sandbox — voir plan

router.post(
  "/revolut",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req: Request, res: Response) => {
    const rawBody = (req.body as Buffer).toString("utf8");
    const signature = req.header("revolut-signature");
    const timestamp = req.header("revolut-request-timestamp");

    if (!verifyRevolutWebhookSignature(rawBody, signature, timestamp)) {
      log("RevolutWebhook", "Invalid signature or expired timestamp", {});
      res.status(401).json({ error: "invalid_signature" });
      return;
    }

    let parsed: { event?: string; subscription_id?: string; id?: string };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ error: "invalid_json" });
      return;
    }

    const event = parsed.event;
    const subscriptionId = parsed.subscription_id ?? parsed.id;

    if (!event || !event.startsWith("SUBSCRIPTION_") || !subscriptionId) {
      if (event?.startsWith("SUBSCRIPTION_") && !subscriptionId) {
        logError("RevolutWebhook", "SUBSCRIPTION_ event missing subscription id", null, { event });
      }
      res.status(204).end();
      return;
    }

    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${event}:${subscriptionId}:${timestamp}`)
      .digest("hex");

    try {
      await RevolutWebhookEvent.create({ idempotencyKey, event, subscriptionId });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        log("RevolutWebhook", "Duplicate event, already processed", { idempotencyKey });
        res.status(204).end();
        return;
      }
      throw err;
    }

    try {
      const subscription = await getRevolutSubscription(subscriptionId);
      const userId = subscription.external_reference;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        logError("RevolutWebhook", "Missing/invalid external_reference on subscription", null, {
          subscriptionId,
          externalReference: userId,
        });
        res.status(204).end();
        return;
      }

      let targetPlan: "free" | "vip" | null = null;
      if (subscription.state === ACTIVE_STATE) {
        targetPlan = "vip";
      } else if (TERMINAL_STATES.has(subscription.state)) {
        targetPlan = "free";
      } else {
        log("RevolutWebhook", "Unhandled subscription state, no-op", {
          state: subscription.state,
          subscriptionId,
        });
      }

      if (targetPlan) {
        await User.findByIdAndUpdate(userId, { subscriptionPlan: targetPlan });
        log("RevolutWebhook", "User subscription plan updated", { userId, targetPlan });
      }

      res.status(204).end();
    } catch (err) {
      if (err instanceof RevolutApiError) {
        logError("RevolutWebhook", "Failed to fetch subscription from Revolut", err, {
          subscriptionId,
        });
        res.status(TRANSIENT_ERROR_STATUS).json({ error: "upstream_error" });
        return;
      }
      logError("RevolutWebhook", "Unexpected error processing webhook", err, { subscriptionId });
      res.status(TRANSIENT_ERROR_STATUS).json({ error: "internal_error" });
    }
  },
);

export default router;
