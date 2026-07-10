import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { createHash } from "crypto";
import type { NewsArticle } from "./news.service.js";

const CACHE_TTL = 6 * 60 * 60;
const MAX_ARTICLES_TO_FILTER = 50;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_news_filtering_enabled" }).lean();
  return entry?.value === "true";
}

function filterHash(articles: NewsArticle[], trackedTitles: string[]): string {
  const articlesKey = articles.map((a) => `${a.title}:${a.link}`).join("|");
  const titlesKey = trackedTitles.sort().join(",");
  return createHash("md5").update(`${articlesKey}::${titlesKey}`).digest("hex").slice(0, 16);
}

export async function aiFilterNewsByTrackedShows(
  articles: NewsArticle[],
  trackedTitles: string[],
): Promise<NewsArticle[]> {
  if (articles.length === 0 || trackedTitles.length === 0) {
    return [];
  }

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return textBasedFilter(articles, trackedTitles);
  }

  const toFilter = articles.slice(0, MAX_ARTICLES_TO_FILTER);
  const rest = articles.slice(MAX_ARTICLES_TO_FILTER);

  const cacheKey = `ai:news-filter:${filterHash(toFilter, trackedTitles)}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      const indices = JSON.parse(cached) as number[];
      const filtered = indices.map((i) => toFilter[i]).filter(Boolean);
      log("AINewsFilter", "served from cache", { count: filtered.length });
      return [...filtered, ...textBasedFilter(rest, trackedTitles)];
    } catch {
      // Cache corrupt, proceed
    }
  }

  const systemPrompt = `You are a news filtering assistant for "Watchr", a TV show and movie tracking app. The user tracks specific shows/movies and wants to see only news articles relevant to their tracked content.

Rules:
- Return ONLY a JSON object: { "indices": [0, 2, 5] } where the numbers are 0-based indices of articles relevant to the tracked shows
- An article is relevant if it discusses a tracked show/movie, its cast, crew, spinoffs, or closely related content
- Be inclusive: if an article mentions a tracked show even tangentially, include it
- If no articles are relevant, return { "indices": [] }
- Do not include articles that are about unrelated shows/movies`;

  const articlesText = toFilter
    .map((a, i) => `[${i}] Title: ${a.title}\nDescription: ${a.description ?? "N/A"}`)
    .join("\n\n");

  const userContent = `Tracked shows/movies:\n${trackedTitles.map((t) => `- ${t}`).join("\n")}\n\nArticles:\n${articlesText}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    temperature: 0.1,
    responseFormat: { type: "json_object" },
    maxTokens: 200,
    feature: "news_filtering",
  });

  if (!result) {
    log("AINewsFilter", "AI unavailable, falling back to text filter");
    return textBasedFilter(articles, trackedTitles);
  }

  try {
    const parsed = JSON.parse(result.content) as { indices: number[] };
    const indices = Array.isArray(parsed.indices)
      ? parsed.indices.filter((i) => typeof i === "number" && i >= 0 && i < toFilter.length)
      : [];

    await setRedisValue(cacheKey, JSON.stringify(indices), CACHE_TTL);
    log("AINewsFilter", "AI filter applied", {
      total: toFilter.length,
      matched: indices.length,
    });

    const filtered = indices.map((i) => toFilter[i]).filter(Boolean);
    return [...filtered, ...textBasedFilter(rest, trackedTitles)];
  } catch (err) {
    logError("AINewsFilter", "parse error", err, { content: result.content.slice(0, 200) });
    return textBasedFilter(articles, trackedTitles);
  }
}

export function textBasedFilter(
  articles: NewsArticle[],
  trackedTitles: string[],
): NewsArticle[] {
  const lowerTitles = trackedTitles.map((t) => t.toLowerCase());
  return articles.filter((article) => {
    const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
    return lowerTitles.some((title) => text.includes(title));
  });
}
