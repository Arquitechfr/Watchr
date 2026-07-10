import { mistralService } from "./mistral.service.js";
import { tmdbService } from "./tmdb.service.js";
import { log } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { toTmdbLanguage } from "./show.service.js";
import { languageNameForLocale } from "./aiLanguageMap.js";

const CACHE_TTL = 7 * 24 * 60 * 60;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_episode_summary_enabled" }).lean();
  return entry?.value === "true";
}

export interface EpisodeSummaryResult {
  summary: string;
  source: "ai" | "tmdb";
}

export async function getEpisodeSummary(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
  locale = "en",
): Promise<EpisodeSummaryResult> {
  const tmdbLanguage = toTmdbLanguage(locale);
  const cacheKey = `ai:episode-summary:${tmdbId}:${seasonNumber}:${episodeNumber}:${locale}`;

  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as EpisodeSummaryResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const season = await tmdbService.getTvSeason(tmdbId, seasonNumber, tmdbLanguage);
  const show = await tmdbService.getTvDetails(tmdbId, tmdbLanguage);

  const showName = show.name ?? show.title ?? "Unknown";
  const episode = season.episodes?.find((e) => e.episode_number === episodeNumber);
  const episodeName = episode?.name ?? `Episode ${episodeNumber}`;
  const overview = episode?.overview ?? "";

  if (!overview || overview.length < 20) {
    const fallback = overview || `${episodeName} of ${showName}, Season ${seasonNumber}`;
    const result: EpisodeSummaryResult = { summary: fallback, source: "tmdb" };
    await setRedisValue(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    const result: EpisodeSummaryResult = { summary: overview, source: "tmdb" };
    return result;
  }

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are an episode summary writer for "Watchr", a TV show tracking app. Write a concise, engaging, spoiler-free summary of the given episode.

Rules:
- Respond in ${languageName}
- Keep the summary under 200 characters
- Do not reveal major plot twists or spoilers
- Focus on the main theme and character development
- Return ONLY the summary text, no JSON, no formatting`;

  const userContent = `Show: ${showName}
Season: ${seasonNumber}, Episode: ${episodeNumber}
Episode title: ${episodeName}
TMDB Overview: ${overview.slice(0, 500)}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    temperature: 0.4,
    maxTokens: 150,
    feature: "episode_summary",
  });

  if (!result) {
    log("AIEpisodeSummary", "AI unavailable, using TMDB overview");
    return { summary: overview, source: "tmdb" };
  }

  const summary = result.content.trim();
  if (!summary || summary.length < 10) {
    return { summary: overview, source: "tmdb" };
  }

  const aiResult: EpisodeSummaryResult = { summary, source: "ai" };
  await setRedisValue(cacheKey, JSON.stringify(aiResult), CACHE_TTL);

  log("AIEpisodeSummary", "summary generated", {
    tmdbId,
    seasonNumber,
    episodeNumber,
    summaryLength: summary.length,
  });

  return aiResult;
}
