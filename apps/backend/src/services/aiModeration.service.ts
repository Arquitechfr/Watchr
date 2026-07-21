import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";

export interface ModerationResult {
  isSpoiler: boolean;
  isToxic: boolean;
  toxicCategory?: string;
  confidence: number;
}

const NEUTRAL_RESULT: ModerationResult = {
  isSpoiler: false,
  isToxic: false,
  confidence: 0,
};

const TOXIC_KEYWORDS = [
  "kill yourself", "kys", "rape", "retard", "faggot", "tranny", "nigger", "nazi",
  "go die", "end yourself", "slit your wrists", "hang yourself",
];

const TOXIC_PATTERNS = [
  /\b(idiot|stupid|moron|trash|garbage)\b.*\b(you|your|ur)\b/i,
  /\b(shut up|stfu|gtfo)\b/i,
  /\b(spam|scam|fraud)\b/i,
];

const SPOILER_KEYWORDS = [
  "dies", "death", "ending", "finale", "twist", "revealed", "plot twist",
  "spoiler", "ends with", "结局", "死亡", "ネタバレ",
];

function heuristicModerate(content: string, showTitle?: string): ModerationResult {
  const lower = content.toLowerCase();
  const showLower = showTitle?.toLowerCase() ?? "";

  let isToxic = false;
  let isSpoiler = false;

  for (const kw of TOXIC_KEYWORDS) {
    if (lower.includes(kw)) {
      isToxic = true;
      break;
    }
  }
  if (!isToxic) {
    for (const pattern of TOXIC_PATTERNS) {
      if (pattern.test(content)) {
        isToxic = true;
        break;
      }
    }
  }

  for (const kw of SPOILER_KEYWORDS) {
    if (lower.includes(kw)) {
      if (showLower && lower.includes(showLower)) {
        isSpoiler = true;
        break;
      }
      isSpoiler = true;
      break;
    }
  }

  if (isToxic || isSpoiler) {
    return {
      isSpoiler,
      isToxic,
      toxicCategory: isToxic ? "other" : undefined,
      confidence: 0.5,
    };
  }

  return NEUTRAL_RESULT;
}

async function isFallbackEnabled(): Promise<boolean> {
  try {
    const entry = await MobileConfig.findOne({ key: "ai_moderation_fallback_enabled" }).lean();
    return entry?.value !== "false";
  } catch {
    return true;
  }
}

async function isFeatureEnabled(key: string): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key }).lean();
  return entry?.value === "true";
}

export async function moderateComment(content: string, showTitle?: string): Promise<ModerationResult> {
  if (!mistralService.isConfigured()) {
    const fallbackEnabled = await isFallbackEnabled();
    if (fallbackEnabled) {
      const heuristic = heuristicModerate(content, showTitle);
      if (heuristic.isToxic || heuristic.isSpoiler) {
        log("AIModeration", "Mistral not configured, heuristic fallback result", { ...heuristic });
        return { ...heuristic, confidence: 0.5 };
      }
    }
    return NEUTRAL_RESULT;
  }

  const [spoilerEnabled, toxicEnabled] = await Promise.all([
    isFeatureEnabled("ai_spoiler_detection_enabled"),
    isFeatureEnabled("ai_toxic_detection_enabled"),
  ]);

  if (!spoilerEnabled && !toxicEnabled) {
    return NEUTRAL_RESULT;
  }

  const tasks: string[] = [];
  if (spoilerEnabled) tasks.push("spoiler");
  if (toxicEnabled) tasks.push("toxic");

  const parts: string[] = ["You are a content moderation assistant for a TV show/movie tracking app. Analyze the user's comment and determine:"];
  if (spoilerEnabled) {
    parts.push("- is_spoiler: Does this comment reveal major plot points, twists, endings, or specific story details about a show/movie that viewers wouldn't know before watching?");
  }
  if (toxicEnabled) {
    parts.push("- is_toxic: Is this comment hateful, harassing, spam, or otherwise inappropriate for a public community?");
    parts.push("- toxic_category: If toxic, categorize as one of: hate, harassment, spam, self_harm, violence, other");
  }
  if (showTitle) {
    parts.push(`The comment is about: ${showTitle}`);
  }
  parts.push('Respond in JSON format only: {"is_spoiler": boolean, "is_toxic": boolean, "toxic_category": string | null, "confidence": number (0-1)}');
  const systemPrompt = parts.join("\n");

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.1,
    responseFormat: { type: "json_object" },
    maxTokens: 200,
    feature: "content_moderation",
  });

  if (!result) {
    log("AIModeration", "AI unavailable, trying heuristic fallback");
    const fallbackEnabled = await isFallbackEnabled();
    if (fallbackEnabled) {
      const heuristic = heuristicModerate(content, showTitle);
      if (heuristic.isToxic || heuristic.isSpoiler) {
        log("AIModeration", "heuristic fallback result", { ...heuristic });
        return { ...heuristic, confidence: 0.5 };
      }
    }
    return NEUTRAL_RESULT;
  }

  try {
    const parsed = JSON.parse(result.content);
    const moderation: ModerationResult = {
      isSpoiler: Boolean(parsed.is_spoiler) && spoilerEnabled,
      isToxic: Boolean(parsed.is_toxic) && toxicEnabled,
      toxicCategory: parsed.toxic_category ?? undefined,
      confidence: Number(parsed.confidence) || 0,
    };
    log("AIModeration", "result", { ...moderation });
    return moderation;
  } catch (err) {
    logError("AIModeration", "parse error", err, { content: result.content.slice(0, 200) });
    return NEUTRAL_RESULT;
  }
}
