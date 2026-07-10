import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { languageNameForLocale } from "./aiLanguageMap.js";
import { Comment } from "../models/comment.model.js";
import { getShowTitle } from "../models/show.model.js";
import { Show } from "../models/show.model.js";
import { Types } from "mongoose";

const CACHE_TTL = 60 * 60;
const MIN_COMMENTS_FOR_SUMMARY = 20;
const MAX_COMMENTS_TO_SEND = 50;

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_thread_summary_enabled" }).lean();
  return entry?.value === "true";
}

export interface ThreadSummaryResult {
  summary: string;
  commentCount: number;
  source: "ai" | "fallback";
}

export async function summarizeThread(
  showId: string,
  locale = "en",
  episodeRef?: { season: number; episode: number },
): Promise<ThreadSummaryResult | null> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return null;
  }

  const cacheKey = `ai:thread-summary:${showId}:${locale}:${episodeRef ? `s${episodeRef.season}e${episodeRef.episode}` : "all"}`;
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as ThreadSummaryResult;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const query: Record<string, unknown> = {
    showId: new Types.ObjectId(showId),
    parentId: null,
    isHidden: false,
  };
  if (episodeRef) {
    query.episodeRef = episodeRef;
  }

  const comments = await Comment.find(query)
    .sort({ likesCount: -1, replyCount: -1, createdAt: -1 })
    .limit(MAX_COMMENTS_TO_SEND)
    .lean();

  if (comments.length < MIN_COMMENTS_FOR_SUMMARY) {
    return null;
  }

  const show = await Show.findById(showId).lean();
  const showTitle = show ? getShowTitle(show, locale) : "Unknown show";

  const languageName = languageNameForLocale(locale);

  const systemPrompt = `You are a comment summarization assistant for "Watchr", a TV show and movie tracking app. Summarize the main opinions and discussions from the comments below in 3 concise bullet points.

Rules:
- Respond in ${languageName}
- Focus on the main themes and opinions (what people liked, disliked, debated)
- Keep each bullet point under 100 characters
- Do not quote individual users
- Return ONLY a JSON object: { "summary": "bullet1\\nbullet2\\nbullet3" }
- Use "• " as bullet prefix`;

  const commentsText = comments
    .map((c) => `- "${c.content.slice(0, 200)}${c.content.length > 200 ? "..." : ""}" (likes: ${c.likesCount}, replies: ${c.replyCount})`)
    .join("\n");

  const userContent = `Show: ${showTitle}
${episodeRef ? `Season ${episodeRef.season}, Episode ${episodeRef.episode}` : "General discussion"}
Comments (${comments.length}):
${commentsText}`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    model: "mistral-small-latest",
    temperature: 0.3,
    responseFormat: { type: "json_object" },
    maxTokens: 300,
    feature: "thread_summary",
  });

  if (!result) {
    log("AICommentSummary", "AI unavailable, skipping summary");
    return null;
  }

  try {
    const parsed = JSON.parse(result.content);
    const summary: string = parsed.summary ?? parsed.text ?? "";

    if (!summary || summary.length < 10) {
      log("AICommentSummary", "summary too short, skipping");
      return null;
    }

    const threadResult: ThreadSummaryResult = {
      summary,
      commentCount: comments.length,
      source: "ai",
    };

    await setRedisValue(cacheKey, JSON.stringify(threadResult), CACHE_TTL);
    log("AICommentSummary", "summary generated", { showId, commentCount: comments.length });
    return threadResult;
  } catch (err) {
    logError("AICommentSummary", "parse error", err, { content: result.content.slice(0, 200) });
    return null;
  }
}
