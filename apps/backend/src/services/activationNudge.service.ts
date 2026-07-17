import { PushNotificationService } from "./pushNotification.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { User } from "../models/user.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { translateNotification } from "../i18n/index.js";
import { normalizeLocale } from "../i18n/translations.js";

const MAX_NUDGES_PER_BATCH = 100;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "activation_nudge_enabled" }).lean();
  return entry?.value === "true";
}

interface DropoffCandidate {
  userId: string;
  locale: ReturnType<typeof normalizeLocale>;
}

async function findDropoffCandidates(): Promise<DropoffCandidate[]> {
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(now - 72 * 60 * 60 * 1000);

  const users = await User.find({
    createdAt: { $gte: seventyTwoHoursAgo, $lte: twentyFourHoursAgo },
    expoPushToken: { $exists: true, $ne: null },
    "notificationPreferences.pushEnabled": { $ne: false },
    activationNudgeSentAt: null,
    hasCompletedOnboarding: true,
  })
    .select("_id preferredLanguage")
    .limit(MAX_NUDGES_PER_BATCH)
    .lean();

  const candidates: DropoffCandidate[] = users.map((user) => ({
    userId: user._id.toString(),
    locale: normalizeLocale(user.preferredLanguage),
  }));

  log("ActivationNudge", "found dropoff candidates", { count: candidates.length });
  return candidates;
}

export async function sendActivationNudgeBatch(): Promise<{ sent: number; skipped: number; failed: number }> {
  const enabled = await isFeatureEnabled();
  if (!enabled) {
    log("ActivationNudge", "feature disabled, skipping");
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const candidates = await findDropoffCandidates();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const watchEntryCount = await WatchEntry.countDocuments({ userId: candidate.userId });

      if (watchEntryCount === 0) {
        const title = translateNotification("activationNudgeTitle", candidate.locale);
        const body = translateNotification("activationNudgeBody", candidate.locale);

        const delivered = await PushNotificationService.sendToUser(
          candidate.userId,
          title,
          body,
          { screen: "home" },
          "activation_nudge",
        );

        if (delivered) {
          sent++;
        } else {
          failed++;
        }
      } else {
        skipped++;
      }

      await User.updateOne(
        { _id: candidate.userId },
        { $set: { activationNudgeSentAt: new Date() } },
      );
    } catch (err) {
      logError("ActivationNudge", "failed to process user", err, { userId: candidate.userId });
      failed++;
    }
  }

  log("ActivationNudge", "batch complete", { sent, skipped, failed });
  return { sent, skipped, failed };
}
