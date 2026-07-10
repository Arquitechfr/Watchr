import { mistralService } from "./mistral.service.js";
import { PushNotificationService } from "./pushNotification.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { User } from "../models/user.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Show } from "../models/show.model.js";
import { getShowTitle } from "../models/show.model.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import type { SupportedLocale } from "../i18n/translations.js";

const INACTIVE_THRESHOLD_DAYS = 14;
const MAX_REENGAGEMENT_PER_BATCH = 100;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_reengagement_enabled" }).lean();
  return entry?.value === "true";
}

interface ReengagementUser {
  userId: string;
  username: string;
  locale: SupportedLocale;
  topShowTitle: string;
  daysSinceLastActivity: number;
}

async function findInactiveUsers(): Promise<ReengagementUser[]> {
  const thresholdDate = new Date(Date.now() - INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const inactiveUsers = await User.find({
    lastLoginAt: { $lt: thresholdDate },
    expoPushToken: { $exists: true, $ne: null },
    "notificationPreferences.pushEnabled": { $ne: false },
  })
    .select("_id username preferredLanguage lastLoginAt")
    .limit(MAX_REENGAGEMENT_PER_BATCH)
    .lean();

  const results: ReengagementUser[] = [];

  for (const user of inactiveUsers) {
    const watchEntries = await WatchEntry.find({ userId: user._id })
      .populate("showId", "title translations")
      .limit(1)
      .lean();

    const topShow = watchEntries[0]?.showId as unknown as { title?: string; translations?: Record<string, { title?: string }> } | undefined;
    const topShowTitle = topShow?.title ?? "your favorite show";

    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(user.lastLoginAt ?? thresholdDate).getTime()) / (24 * 60 * 60 * 1000),
    );

    results.push({
      userId: user._id.toString(),
      username: user.username,
      locale: (user.preferredLanguage ?? "en") as SupportedLocale,
      topShowTitle,
      daysSinceLastActivity,
    });
  }

  log("AIReengagement", "found inactive users", { count: results.length });
  return results;
}

async function generateReengagementMessage(user: ReengagementUser): Promise<{ title: string; body: string } | null> {
  const languageName = languageNameForLocale(user.locale);

  const systemPrompt = `You are a re-engagement message writer for "Watchr", a TV show and movie tracking app. Write a personalized push notification to bring the user back.

Rules:
- Respond in ${languageName}
- Return ONLY a JSON object with: title (max 40 chars), body (max 100 chars)
- Be warm, encouraging, not pushy
- Reference their tracked show if possible
- Do not use guilt trips`;

  const userContent = `Username: ${user.username}
Days since last visit: ${user.daysSinceLastActivity}
Top tracked show: ${user.topShowTitle}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    temperature: 0.7,
    responseFormat: { type: "json_object" },
    maxTokens: 150,
    feature: "reengagement",
  });

  if (!result) {
    return null;
  }

  try {
    const parsed = JSON.parse(result.content);
    return {
      title: parsed.title ?? "We miss you!",
      body: parsed.body ?? "Your shows are waiting for you.",
    };
  } catch (err) {
    logError("AIReengagement", "parse error", err, { content: result.content.slice(0, 200) });
    return null;
  }
}

function getFallbackMessage(user: ReengagementUser): { title: string; body: string } {
  return {
    title: `Hi ${user.username}!`,
    body: `${user.topShowTitle} is waiting for you. Come back and catch up!`,
  };
}

export async function sendReengagementBatch(): Promise<{ sent: number; failed: number; skipped: number }> {
  const enabled = await isFeatureEnabled();
  if (!enabled) {
    log("AIReengagement", "feature disabled, skipping");
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const users = await findInactiveUsers();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      let message = await generateReengagementMessage(user);
      if (!message) {
        message = getFallbackMessage(user);
        skipped++;
      }

      await PushNotificationService.sendToUser(
        user.userId,
        message.title,
        message.body,
        { screen: "home" },
      );

      sent++;
    } catch (err) {
      logError("AIReengagement", "failed to send to user", err, { userId: user.userId });
      failed++;
    }
  }

  log("AIReengagement", "batch complete", { sent, failed, skipped });
  return { sent, failed, skipped };
}
