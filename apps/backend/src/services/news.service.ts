import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";
import { NewsSource } from "../models/newsSource.model.js";
import type { SupportedLocale } from "../i18n/translations.js";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  image?: string;
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

export async function getNews(sourceId?: string, limit: number = 30): Promise<NewsArticle[]> {
  let source = null;

  if (sourceId) {
    source = await NewsSource.findOne({ id: sourceId, isActive: true }).lean();
  }

  if (!source) {
    throw new ApiError(400, "INVALID_SOURCE", "Invalid news source");
  }

  log("NewsService", "fetch", { sourceId: source.id, url: source.url });

  try {
    const response = await axios.get<string>(source.url, {
      timeout: 10_000,
      headers: {
        "User-Agent": "Watchr/1.0 (RSS reader)",
      },
    });

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
    const articles = (Array.isArray(items) ? items : [items])
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

    log("NewsService", "articles", { count: articles.length });
    return articles;
  } catch (err) {
    logError("NewsService", "fetch failed", err, { sourceId: source.id });
    throw new ApiError(502, "NEWS_FETCH_ERROR", "Failed to fetch news feed");
  }
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
