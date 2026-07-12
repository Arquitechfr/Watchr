import { mistralService } from "./mistral.service.js";
import { tmdbService } from "./tmdb.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { sleep } from "../lib/rateLimiter.js";
import { ParsedRecord } from "./import/types.js";

export interface AIShowSuggestion {
  suggestedTitle: string;
  suggestedYear?: number;
  suggestedType?: "tv" | "movie";
  confidence: number;
}

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_import_matching_enabled" }).lean();
  return entry?.value === "true";
}

export async function aiFuzzyMatch(record: ParsedRecord): Promise<{ tmdbId: number; type: "tv" | "movie" } | null> {
  if (!record.title) return null;

  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return null;
  }

  const systemPrompt = `You are a TV show/movie matching assistant. Given an imported record with a possibly misspelled or incomplete title, suggest the most likely correct title and type.

Respond in JSON format only:
{
  "suggested_title": "corrected title",
  "suggested_year": year_or_null,
  "suggested_type": "tv" or "movie",
  "confidence": 0-1
}

Rules:
- Only suggest if confidence >= 0.7
- If you cannot identify the show with high confidence, return confidence < 0.7`;

  const userContent = `Title: "${record.title}"
Year: ${record.year ?? "unknown"}
Type: ${record.type ?? "unknown"}
IMDB ID: ${record.imdbId ?? "none"}`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.1,
    responseFormat: { type: "json_object" },
    maxTokens: 150,
    feature: "import_matching",
  });

  if (!result) {
    return null;
  }

  try {
    const parsed: AIShowSuggestion = JSON.parse(result.content);

    if (parsed.confidence < 0.7) {
      log("AIImport", "low confidence, skipping", { title: record.title, confidence: parsed.confidence });
      return null;
    }

    const searchQuery = parsed.suggestedYear
      ? `${parsed.suggestedTitle} ${parsed.suggestedYear}`
      : parsed.suggestedTitle;
    const searchType = parsed.suggestedType ?? record.type ?? "tv";

    await sleep(250);

    const tmdbResults = searchType === "movie"
      ? await tmdbService.searchMovies(searchQuery).catch(() => [])
      : await tmdbService.searchShows(searchQuery).catch(() => []);

    const match = tmdbResults[0];
    if (!match) {
      log("AIImport", "AI suggested title but no TMDB match", { suggested: parsed.suggestedTitle });
      return null;
    }

    log("AIImport", "fuzzy match found", {
      original: record.title,
      suggested: parsed.suggestedTitle,
      tmdbId: match.id,
      confidence: parsed.confidence,
    });

    return { tmdbId: match.id, type: searchType };
  } catch (err) {
    logError("AIImport", "parse error", err, { content: result.content.slice(0, 200) });
    return null;
  }
}
