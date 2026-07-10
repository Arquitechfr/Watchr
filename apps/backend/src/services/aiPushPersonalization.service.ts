import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import type { SupportedLocale } from "../i18n/translations.js";

const CACHE_TTL = 24 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_push_personalization_enabled" }).lean();
  return entry?.value === "true";
}

export interface PersonalizedPushContent {
  title: string;
  body: string;
  source: "ai" | "fallback";
}

export async function personalizePushContent(
  userId: string,
  baseTitle: string,
  baseBody: string,
  context: {
    type: "new_episode" | "new_release" | "comment_reply" | "comment_like" | "comment_reaction";
    showTitle?: string;
    season?: number;
    episode?: number;
    author?: string;
  },
  locale: SupportedLocale = "en",
): Promise<PersonalizedPushContent> {
  const fallback: PersonalizedPushContent = { title: baseTitle, body: baseBody, source: "fallback" };

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return fallback;
  }

  const cacheKey = `ai:push-personalized:${userId}:${context.type}:${locale}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as PersonalizedPushContent;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are a push notification writer for "Watchr", a TV show and movie tracking app. Rewrite the given notification to be more engaging and personalized.

Rules:
- Respond in ${languageName}
- Keep the title under 50 characters
- Keep the body under 120 characters
- Be warm, engaging, and conversational — not robotic
- Do NOT use clickbait or excessive punctuation
- Return ONLY a JSON object: { "title": "...", "body": "..." }
- Preserve the core information (show name, season/episode, author)`;

  const contextStr = [
    `Notification type: ${context.type}`,
    context.showTitle ? `Show: ${context.showTitle}` : null,
    context.season !== undefined ? `Season: ${context.season}, Episode: ${context.episode}` : null,
    context.author ? `User: ${context.author}` : null,
    `Original title: ${baseTitle}`,
    `Original body: ${baseBody}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: contextStr },
    ],
    model: "mistral-small-latest",
    temperature: 0.7,
    responseFormat: { type: "json_object" },
    maxTokens: 150,
    feature: "push_personalization",
  });

  if (!result) {
    log("AIPushPersonalization", "AI unavailable, using fallback");
    return fallback;
  }

  try {
    const parsed = JSON.parse(result.content);
    const title: string = parsed.title ?? baseTitle;
    const body: string = parsed.body ?? baseBody;

    if (!title || !body || title.length < 3 || body.length < 5) {
      return fallback;
    }

    const personalized: PersonalizedPushContent = {
      title: title.slice(0, 50),
      body: body.slice(0, 120),
      source: "ai",
    };

    await setRedisValue(cacheKey, JSON.stringify(personalized), CACHE_TTL);
    log("AIPushPersonalization", "personalized", { userId, type: context.type });
    return personalized;
  } catch (err) {
    logError("AIPushPersonalization", "parse error", err, { content: result.content.slice(0, 200) });
    return fallback;
  }
}
