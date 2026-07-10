import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";
import { NewsSource } from "../models/newsSource.model.js";
import type { SupportedLocale } from "../i18n/translations.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { enrichNewsWithSummaries } from "./aiNews.service.js";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  image?: string;
  aiSummary?: string;
}

export interface NewsSourceDTO {
  id: string;
  name: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
  parseAttributeValue: false,
});

export async function getNewsSourcesByLocale(locale: SupportedLocale): Promise<NewsSourceDTO[]> {
  const sources = await NewsSource.find({ locale, isActive: true }).sort({ createdAt: 1 }).lean();
  return sources.map((s) => ({ id: s.id, name: s.name }));
}

export async function getDefaultSourceId(locale: SupportedLocale): Promise<string | null> {
  const source = await NewsSource.findOne({ locale, isActive: true }).sort({ createdAt: 1 }).lean();
  return source?.id ?? null;
}

export async function getNews(sourceId?: string, limit: number = 30, locale: string = "en"): Promise<NewsArticle[]> {
  if (sourceId) {
    return getNewsFromSingleSource(sourceId, limit, locale);
  }
  return getNewsFromAllSources(limit, locale);
}

async function getNewsFromSingleSource(sourceId: string, limit: number, locale: string): Promise<NewsArticle[]> {
  const cacheKey = `news:${sourceId}:${limit}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as NewsArticle[];
    } catch {
      // Cache corrupt, proceed to fetch
    }
  }

  const source = await NewsSource.findOne({ id: sourceId, isActive: true }).lean();

  if (!source) {
    throw new ApiError(400, "INVALID_SOURCE", "Invalid news source");
  }

  log("NewsService", "fetch single source", { sourceId: source.id, url: source.url });

  try {
    const articles = await fetchAndParseFeed(source.url, limit);
    log("NewsService", "articles", { count: articles.length });
    const enriched = await enrichNewsWithSummaries(articles, locale);
    await setRedisValue(cacheKey, JSON.stringify(enriched), 120);
    return enriched;
  } catch (err) {
    logError("NewsService", "fetch failed", err, { sourceId: source.id });
    if (cached) {
      log("NewsService", "serving stale cache", { sourceId: source.id });
      try {
        return JSON.parse(cached) as NewsArticle[];
      } catch {
        // Cache corrupt, fall through to error
      }
    }
    throw new ApiError(502, "NEWS_FETCH_ERROR", "Failed to fetch news feed");
  }
}

async function getNewsFromAllSources(limit: number, locale: string): Promise<NewsArticle[]> {
  const cacheKey = `news:all:${locale}:${limit}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as NewsArticle[];
    } catch {
      // Cache corrupt, proceed to fetch
    }
  }

  const sources = await NewsSource.find({ locale, isActive: true }).sort({ createdAt: 1 }).lean();
  if (sources.length === 0) {
    return [];
  }

  log("NewsService", "fetch all sources", { count: sources.length, locale });

  const results = await Promise.allSettled(
    sources.map((source) => fetchAndParseFeed(source.url, limit)),
  );

  const allArticles: NewsArticle[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    } else {
      logError("NewsService", "source fetch failed", result.reason, { sourceId: sources[i].id });
    }
  }

  allArticles.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  const sliced = allArticles.slice(0, limit);
  log("NewsService", "aggregated articles", { total: allArticles.length, returned: sliced.length });

  const enriched = await enrichNewsWithSummaries(sliced, locale);
  await setRedisValue(cacheKey, JSON.stringify(enriched), 120);
  return enriched;
}

async function fetchAndParseFeed(url: string, limit: number): Promise<NewsArticle[]> {
  const response = await fetchWithRetry(url);

  const parsed = parser.parse(response.data) as {
    rss?: {
      channel?: {
        item?: Array<{
          title?: string;
          link?: string;
          pubDate?: string;
          description?: string;
          "media:thumbnail"?: { url?: string } | Array<{ url?: string }>;
          enclosure?: { url?: string } | Array<{ url?: string }>;
        }>;
      };
    };
  };

  const items = parsed.rss?.channel?.item ?? [];
  return (Array.isArray(items) ? items : [items])
    .slice(0, limit)
    .map((item): NewsArticle => {
      const thumbnail = item["media:thumbnail"];
      const enclosure = item.enclosure;
      const image = extractImageUrl(thumbnail) || extractImageUrl(enclosure);

      return {
        title: cleanText(item.title) || "Sans titre",
        link: item.link || "",
        pubDate: item.pubDate,
        description: cleanText(item.description),
        image,
      };
    });
}

async function fetchWithRetry(url: string, maxRetries = 2): Promise<{ data: string }> {
  const headers = {
    "User-Agent": "Watchr/1.0 (RSS reader; +https://watchr.me)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Encoding": "gzip",
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get<string>(url, {
        timeout: 15_000,
        headers,
        decompress: true,
      });
      return { data: response.data };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        log("NewsService", "fetch retry", { url, attempt: attempt + 1, backoffMs });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  throw lastErr;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function extractImageUrl(
  value: { url?: string } | Array<{ url?: string }> | undefined,
): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0]?.url;
  }
  return value.url;
}
