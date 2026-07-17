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

async function isFeatureEnabled(key: string): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key }).lean();
  return entry?.value === "true";
}

export async function moderateComment(content: string, showTitle?: string): Promise<ModerationResult> {
  if (!mistralService.isConfigured()) {
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
    log("AIModeration", "AI unavailable, returning neutral");
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
