import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import type { NewsArticle } from "./news.service.js";
import { createHash } from "crypto";
import { languageNameForLocale } from "./aiLanguageMap.js";

const CACHE_TTL = 86400;
const MAX_ARTICLES_TO_SUMMARIZE = 10;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_news_summary_enabled" }).lean();
  return entry?.value === "true";
}

function articleHash(article: NewsArticle): string {
  return createHash("md5").update(`${article.title}:${article.link}`).digest("hex").slice(0, 16);
}

export async function summarizeArticle(
  article: NewsArticle,
  locale = "en",
): Promise<string | null> {
  const cacheKey = `ai:news-summary:${articleHash(article)}:${locale}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached).summary as string;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are a news summarization assistant for "Watchr", a TV show and movie tracking app. Summarize the following entertainment news article in 2-3 concise sentences.

Rules:
- Respond in ${languageName}
- Keep the summary under 200 characters
- Focus on the key information (what show/movie, what happened)
- Do not add opinions or speculation
- Return ONLY the summary text, no JSON, no formatting`;

  const userContent = `Title: ${article.title}
Description: ${article.description ?? "No description available"}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    temperature: 0.3,
    maxTokens: 100,
    feature: "news_summary",
  });

  if (!result) {
    log("AINews", "AI unavailable, skipping summary");
    return null;
  }

  const summary = result.content.trim();
  if (!summary || summary.length < 10) {
    log("AINews", "summary too short, skipping");
    return null;
  }

  await setRedisValue(cacheKey, JSON.stringify({ summary }), CACHE_TTL);
  log("AINews", "summary generated", { title: article.title.slice(0, 50) });
  return summary;
}

export async function enrichNewsWithSummaries(
  articles: NewsArticle[],
  locale = "en",
): Promise<NewsArticle[]> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return articles;
  }

  const articlesToSummarize = articles.slice(0, MAX_ARTICLES_TO_SUMMARIZE);

  const enriched = await Promise.all(
    articlesToSummarize.map(async (article) => {
      try {
        const summary = await summarizeArticle(article, locale);
        return summary ? { ...article, aiSummary: summary } : article;
      } catch (err) {
        logError("AINews", "summary failed", err, { title: article.title.slice(0, 50) });
        return article;
      }
    }),
  );

  const rest = articles.slice(MAX_ARTICLES_TO_SUMMARIZE);
  return [...enriched, ...rest];
}
