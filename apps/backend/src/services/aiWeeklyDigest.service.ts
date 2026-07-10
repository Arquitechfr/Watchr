import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { User } from "../models/user.model.js";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Comment } from "../models/comment.model.js";
import { Show } from "../models/show.model.js";
import { getShowTitle } from "../models/show.model.js";
import { EmailService } from "./email.service.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import type { SupportedLocale } from "../i18n/translations.js";

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_email_digest_enabled" }).lean();
  return entry?.value === "true";
}

interface UserWeeklyData {
  username: string;
  email: string;
  locale: SupportedLocale;
  watchedCount: number;
  topShows: string[];
  commentsCount: number;
  streak: number;
}

async function gatherUserWeeklyData(userId: string): Promise<UserWeeklyData | null> {
  const user = await User.findById(userId).select("username email preferredLanguage").lean();
  if (!user) return null;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [watchEntries, comments] = await Promise.all([
    WatchEntry.find({ userId, updatedAt: { $gte: oneWeekAgo } })
      .populate("showId", "title translations")
      .lean(),
    Comment.countDocuments({ userId, createdAt: { $gte: oneWeekAgo } }),
  ]);

  const showIds = watchEntries.map((w) => w.showId).filter(Boolean);
  const shows = await Show.find({ _id: { $in: showIds } }).lean();

  const topShows = shows
    .slice(0, 5)
    .map((s) => getShowTitle(s, user.preferredLanguage ?? "en"));

  return {
    username: user.username,
    email: user.email,
    locale: (user.preferredLanguage ?? "en") as SupportedLocale,
    watchedCount: watchEntries.length,
    topShows,
    commentsCount: comments,
    streak: 0,
  };
}

export interface DigestContent {
  subject: string;
  heading: string;
  intro: string;
  highlights: string[];
  recommendation: string;
  closing: string;
}

async function generateDigestContent(
  data: UserWeeklyData,
): Promise<DigestContent> {
  const languageName = languageNameForLocale(data.locale);

  const systemPrompt = `You are a weekly digest writer for "Watchr", a TV show and movie tracking app. Write a personalized weekly digest email for the user.

Rules:
- Respond in ${languageName}
- Return ONLY a JSON object with: subject (string, max 60 chars), heading (string, max 40 chars), intro (string, max 200 chars), highlights (array of 3 strings, each max 100 chars), recommendation (string, max 150 chars), closing (string, max 100 chars)
- Be warm, encouraging, and conversational
- Use the user's activity data to personalize
- If the user had no activity, be encouraging and suggest coming back`;

  const userContent = `User: ${data.username}
Shows watched this week: ${data.watchedCount}
Top shows: ${data.topShows.join(", ") || "None"}
Comments posted: ${data.commentsCount}
Current streak: ${data.streak} days`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.7,
    responseFormat: { type: "json_object" },
    maxTokens: 800,
    feature: "weekly_digest",
  });

  if (!result) {
    return getFallbackDigestContent(data);
  }

  try {
    const parsed = JSON.parse(result.content);
    return {
      subject: parsed.subject ?? "Your weekly Watchr digest",
      heading: parsed.heading ?? "Weekly digest",
      intro: parsed.intro ?? "",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      recommendation: parsed.recommendation ?? "",
      closing: parsed.closing ?? "",
    };
  } catch (err) {
    logError("AIWeeklyDigest", "parse error", err, { content: result.content.slice(0, 200) });
    return getFallbackDigestContent(data);
  }
}

function getFallbackDigestContent(data: UserWeeklyData): DigestContent {
  const watchedText = data.watchedCount > 0
    ? `You watched ${data.watchedCount} show${data.watchedCount > 1 ? "s" : ""} this week.`
    : "No activity this week — but it's never too late to start!";

  return {
    subject: "Your weekly Watchr digest",
    heading: "Weekly digest",
    intro: watchedText,
    highlights: data.topShows.length > 0 ? data.topShows.map((s) => `Watched: ${s}`) : ["No shows tracked this week"],
    recommendation: "Discover new shows on Watchr!",
    closing: "See you next week!",
  };
}

export async function sendWeeklyDigestToUser(userId: string): Promise<boolean> {
  const enabled = await isFeatureEnabled();
  if (!enabled) {
    log("AIWeeklyDigest", "feature disabled, skipping");
    return false;
  }

  const data = await gatherUserWeeklyData(userId);
  if (!data) return false;

  const content = await generateDigestContent(data);

  const success = await EmailService.sendCustomEmail(
    data.email,
    content.subject,
    buildDigestHtml(content),
    data.locale,
    "weekly_digest",
  );

  log("AIWeeklyDigest", "digest sent", { userId, success });
  return success;
}

export async function sendWeeklyDigestBatch(): Promise<void> {
  const enabled = await isFeatureEnabled();
  if (!enabled) {
    log("AIWeeklyDigest", "feature disabled, skipping batch");
    return;
  }

  const users = await User.find({
    "notificationPreferences.emailEnabled": true,
  })
    .select("_id")
    .lean();

  log("AIWeeklyDigest", "starting batch", { userCount: users.length });

  const BATCH_SIZE = 10;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((u) => sendWeeklyDigestToUser(u._id.toString())),
    );
    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  log("AIWeeklyDigest", "batch complete");
}

function buildDigestHtml(content: DigestContent): string {
  const highlightsHtml = content.highlights
    .map((h) => `<li style="color:#C4BDB6;font-size:0.95rem;line-height:1.6;margin:0 0 8px 0;">${h}</li>`)
    .join("");

  return `
    <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${content.heading}</h1>
    <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">${content.intro}</p>
    ${highlightsHtml ? `
      <ul style="list-style:none;padding:0;margin:0 0 24px 0;">
        ${highlightsHtml}
      </ul>
    ` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
          <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#128161; ${content.recommendation}</p>
        </td>
      </tr>
    </table>
    <a href="https://app.watchr.me" class="email-cta" style="display:inline-block;background-color:#C65D3A;color:#F5F0EB;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">Open Watchr</a>
    <p class="email-footer" style="color:#8B8278;font-size:0.8rem;margin:24px 0 0 0;line-height:1.5;">${content.closing}</p>
  `;
}
