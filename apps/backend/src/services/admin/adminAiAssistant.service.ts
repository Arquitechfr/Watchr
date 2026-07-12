import { mistralService } from "../mistral.service.js";
import { logError } from "../../lib/logger.js";
import { MobileConfig } from "../../models/MobileConfig.js";
import { Comment } from "../../models/comment.model.js";
import { Show } from "../../models/show.model.js";
import { getShowTitle } from "../../models/show.model.js";
import { Report } from "../../models/report.model.js";
import type { SupportedLocale } from "../../i18n/translations.js";

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_admin_assistant_enabled" }).lean();
  return entry?.value === "true";
}

export interface CommentAnalysis {
  sentiment: "positive" | "neutral" | "negative" | "toxic";
  confidence: number;
  suggestedAction: "none" | "flag" | "hide" | "spoiler";
  reason: string;
}

export async function analyzeComment(commentId: string): Promise<CommentAnalysis> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return { sentiment: "neutral", confidence: 0, suggestedAction: "none", reason: "AI not available" };
  }

  const comment = await Comment.findById(commentId).lean();
  if (!comment) {
    return { sentiment: "neutral", confidence: 0, suggestedAction: "none", reason: "Comment not found" };
  }

  const systemPrompt = `You are a content moderation assistant for "Watchr", a TV show and movie tracking app. Analyze the given comment and determine:

1. Sentiment: positive, neutral, negative, or toxic
2. Confidence: 0.0 to 1.0
3. Suggested action: none, flag (for review), hide (inappropriate), or spoiler (contains spoiler)
4. Reason: brief explanation (max 100 chars)

Return ONLY a JSON object with: sentiment, confidence, suggestedAction, reason`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: comment.content.slice(0, 1000) },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.2,
    responseFormat: { type: "json_object" },
    maxTokens: 300,
    feature: "admin_assistant",
  });

  if (!result) {
    return { sentiment: "neutral", confidence: 0, suggestedAction: "none", reason: "AI unavailable" };
  }

  try {
    const parsed = JSON.parse(result.content);
    return {
      sentiment: parsed.sentiment ?? "neutral",
      confidence: parsed.confidence ?? 0,
      suggestedAction: parsed.suggestedAction ?? "none",
      reason: parsed.reason ?? "",
    };
  } catch (err) {
    logError("AdminAiAssistant", "parse error", err, { content: result.content.slice(0, 200) });
    return { sentiment: "neutral", confidence: 0, suggestedAction: "none", reason: "Parse error" };
  }
}

export interface ReportSuggestion {
  recommendedAction: "resolve" | "dismiss" | "escalate";
  reason: string;
  draftResponse: string;
}

export async function suggestReportAction(reportId: string): Promise<ReportSuggestion> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return { recommendedAction: "resolve", reason: "AI not available", draftResponse: "" };
  }

  const report = await Report.findById(reportId).lean();
  if (!report) {
    return { recommendedAction: "resolve", reason: "Report not found", draftResponse: "" };
  }

  const comment = await Comment.findById(report.commentId).lean();
  if (!comment) {
    return { recommendedAction: "dismiss", reason: "Comment not found", draftResponse: "" };
  }

  const systemPrompt = `You are a moderation assistant for "Watchr". Based on the report reason and comment content, suggest:

1. Recommended action: resolve (no action needed), dismiss (frivolous report), or escalate (serious violation)
2. Reason: brief explanation (max 150 chars)
3. Draft response: a message to send to the reporter (max 200 chars, empathetic and professional)

Return ONLY a JSON object with: recommendedAction, reason, draftResponse`;

  const userContent = `Report reason: ${report.reason}
Comment content: ${comment.content.slice(0, 500)}`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.3,
    responseFormat: { type: "json_object" },
    maxTokens: 400,
    feature: "admin_assistant",
  });

  if (!result) {
    return { recommendedAction: "resolve", reason: "AI unavailable", draftResponse: "" };
  }

  try {
    const parsed = JSON.parse(result.content);
    return {
      recommendedAction: parsed.recommendedAction ?? "resolve",
      reason: parsed.reason ?? "",
      draftResponse: parsed.draftResponse ?? "",
    };
  } catch (err) {
    logError("AdminAiAssistant", "parse error", err, { content: result.content.slice(0, 200) });
    return { recommendedAction: "resolve", reason: "Parse error", draftResponse: "" };
  }
}

export interface ShowDescriptionSuggestion {
  description: string;
  tags: string[];
}

export async function suggestShowDescription(
  showId: string,
  locale: SupportedLocale = "en",
): Promise<ShowDescriptionSuggestion> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return { description: "", tags: [] };
  }

  const show = await Show.findById(showId).lean();
  if (!show) {
    return { description: "", tags: [] };
  }

  const title = getShowTitle(show, locale);
  const genres = show.genres ?? [];

  const systemPrompt = `You are a content writer for "Watchr", a TV show and movie tracking app. Write an engaging description for the given show.

Rules:
- Return ONLY a JSON object with: description (string, max 300 chars, engaging and spoiler-free), tags (array of 5-8 relevant tags)
- Tags should be single words or short phrases relevant to the show's themes`;

  const userContent = `Title: ${title}
Type: ${show.type}
Genres: ${genres.join(", ") || "Unknown"}
TMDB Overview: ${(show.translations?.[locale]?.overview ?? show.translations?.en?.overview ?? "").slice(0, 500)}`;

  const result = await mistralService.safeChatWithFallback({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.6,
    responseFormat: { type: "json_object" },
    maxTokens: 500,
    feature: "admin_assistant",
  });

  if (!result) {
    return { description: "", tags: [] };
  }

  try {
    const parsed = JSON.parse(result.content);
    return {
      description: parsed.description ?? "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (err) {
    logError("AdminAiAssistant", "parse error", err, { content: result.content.slice(0, 200) });
    return { description: "", tags: [] };
  }
}
