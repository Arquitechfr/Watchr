import { mistralService } from "./mistral.service.js";
import { tmdbService } from "./tmdb.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { toTmdbLanguage } from "./show.service.js";

const CACHE_TTL = 30 * 24 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_enriched_tags_enabled" }).lean();
  return entry?.value === "true";
}

export interface EnrichedTagsResult {
  tags: string[];
  source: "ai" | "tmdb";
}

export async function getEnrichedTags(
  tmdbId: number,
  type: "tv" | "movie",
  locale = "en",
): Promise<EnrichedTagsResult> {
  const tmdbLanguage = toTmdbLanguage(locale);
  const cacheKey = `ai:enriched-tags:${tmdbId}:${type}:${locale}`;

  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as EnrichedTagsResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const details =
    type === "tv"
      ? await tmdbService.getTvDetails(tmdbId, tmdbLanguage)
      : await tmdbService.getMovieDetails(tmdbId, tmdbLanguage);

  const title = details.name ?? details.title ?? "Unknown";
  const overview = details.overview ?? "";
  const genres: string[] = details.genres?.map((g) => g.name).filter((n): n is string => Boolean(n)) ?? [];

  if (!overview || overview.length < 20) {
    const result: EnrichedTagsResult = { tags: genres as string[], source: "tmdb" };
    await setRedisValue(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return { tags: genres as string[], source: "tmdb" };
  }

  const systemPrompt = `You are a content tagger for "Watchr", a TV show and movie tracking app. Generate relevant tags for the given show.

Rules:
- Return ONLY a JSON object with: tags (array of 5-10 single-word or short-phrase tags)
- Tags should capture themes, mood, setting, and genre elements
- Tags should be in English (universal tags)
- Do not include the show title as a tag
- Do not duplicate genre names already provided`;

  const userContent = `Title: ${title}
Type: ${type}
Genres: ${genres.join(", ") || "Unknown"}
Overview: ${overview.slice(0, 400)}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    temperature: 0.4,
    responseFormat: { type: "json_object" },
    maxTokens: 200,
    feature: "enriched_tags",
  });

  if (!result) {
    log("AIEnrichedTags", "AI unavailable, using TMDB genres");
    return { tags: genres as string[], source: "tmdb" };
  }

  try {
    const parsed = JSON.parse(result.content);
    const aiTags: string[] = Array.isArray(parsed.tags) ? parsed.tags : [];
    const allTags = [...new Set([...genres, ...aiTags])].slice(0, 12);
    const aiResult: EnrichedTagsResult = { tags: allTags, source: "ai" };
    await setRedisValue(cacheKey, JSON.stringify(aiResult), CACHE_TTL);
    log("AIEnrichedTags", "tags generated", { tmdbId, type, tagCount: allTags.length });
    return aiResult;
  } catch (err) {
    logError("AIEnrichedTags", "parse error", err, { content: result.content.slice(0, 200) });
    return { tags: genres as string[], source: "tmdb" };
  }
}
