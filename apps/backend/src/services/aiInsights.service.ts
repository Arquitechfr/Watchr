import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import type { UserStats } from "./stats.service.js";

const CACHE_TTL = 6 * 60 * 60;

export interface AiInsight {
  type: "positive" | "informational" | "suggestion";
  title: string;
  message: string;
}

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_insights_enabled" }).lean();
  return entry?.value === "true";
}

export async function generateInsights(
  userId: string,
  stats: UserStats,
  locale = "en",
): Promise<AiInsight[] | null> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return null;
  }

  const cacheKey = `ai:insights:${userId}:${locale}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as AiInsight[];
    } catch {
      // Cache corrupt, proceed
    }
  }

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are a viewing insights generator for "Watchr", a TV show and movie tracking app. Based on the user's statistics, generate 3-5 engaging narrative insights.

Rules:
- Respond in ${languageName}
- Return ONLY a JSON array of objects with: type ("positive" | "informational" | "suggestion"), title (short, max 50 chars), message (engaging narrative, max 200 chars)
- "positive" = celebrate an achievement
- "informational" = interesting observation about their habits
- "suggestion" = gentle recommendation based on their data
- Be encouraging and fun, not judgmental
- Keep it concise and engaging`;

  const userContent = `Here are my stats:
- TV shows tracked: ${stats.tvCount}
- Movies tracked: ${stats.movieCount}
- Episodes watched: ${stats.episodesWatched}
- Hours watched: ${stats.hoursWatched}
- Current streak: ${stats.watchStreak} days
- Comments: ${stats.commentsCount}
- Reactions given: ${stats.reactionsCount}
- Likes given: ${stats.likesCount}
- Top genres: ${stats.genreBreakdown.map((g) => g.name).join(", ") || "None yet"}
- Member since: ${stats.memberSince}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-large-latest",
    temperature: 0.8,
    responseFormat: { type: "json_object" },
    maxTokens: 800,
    feature: "insights",
  });

  if (!result) {
    log("AIInsights", "AI unavailable, skipping insights");
    return null;
  }

  try {
    const parsed = JSON.parse(result.content);
    const insights: AiInsight[] = Array.isArray(parsed)
      ? parsed
      : parsed.insights ?? parsed.data ?? [];

    if (!Array.isArray(insights) || insights.length === 0) {
      log("AIInsights", "no insights parsed");
      return null;
    }

    const valid = insights
      .filter((i) => i && typeof i.title === "string" && typeof i.message === "string")
      .slice(0, 5)
      .map((i) => ({
        type: (["positive", "informational", "suggestion"].includes(i.type) ? i.type : "informational") as AiInsight["type"],
        title: i.title,
        message: i.message,
      }));

    if (valid.length === 0) {
      return null;
    }

    await setRedisValue(cacheKey, JSON.stringify(valid), CACHE_TTL);
    log("AIInsights", "insights generated", { count: valid.length, userId });
    return valid;
  } catch (err) {
    logError("AIInsights", "parse error", err, { content: result.content.slice(0, 200) });
    return null;
  }
}
