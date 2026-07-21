import { Router, Request, Response } from "express";
import { EmailLog } from "../models/emailLog.model.js";
import { posthogClient } from "../lib/posthog.js";
import { log } from "../lib/logger.js";

const router = Router();

const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

router.get("/email-open", async (req: Request, res: Response) => {
  const eid = String(req.query.eid ?? "");

  if (eid) {
    try {
      const emailLog = await EmailLog.findById(eid).select("to template").lean();
      if (emailLog) {
        posthogClient.capture({
          distinctId: emailLog.to,
          event: "email_opened",
          properties: {
            emailLogId: eid,
            template: emailLog.template,
          },
        });
      }
    } catch (err) {
      log("EmailTracking", "failed to track open", { eid, err });
    }
  }

  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.send(TRACKING_PIXEL);
});

router.get("/email-click", async (req: Request, res: Response) => {
  const eid = String(req.query.eid ?? "");
  const url = String(req.query.url ?? "");

  if (eid) {
    try {
      const emailLog = await EmailLog.findById(eid).select("to template").lean();
      if (emailLog) {
        posthogClient.capture({
          distinctId: emailLog.to,
          event: "email_clicked",
          properties: {
            emailLogId: eid,
            template: emailLog.template,
            targetUrl: url || null,
          },
        });
      }
    } catch (err) {
      log("EmailTracking", "failed to track click", { eid, err });
    }
  }

  if (url && /^https?:\/\//i.test(url)) {
    res.redirect(302, url);
  } else {
    res.redirect(302, "https://app.watchr.me");
  }
});

export default router;
