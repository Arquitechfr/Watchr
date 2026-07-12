import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { Comment } from "../models/comment.model.js";
import { SUPPORTED_LOCALES } from "../i18n/translations.js";

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_comment_translation_enabled" }).lean();
  return entry?.value === "true";
}

interface TranslationResult {
  detectedLanguage: string;
  translations: Record<string, string>;
}

export async function translateCommentContent(
  content: string,
): Promise<TranslationResult | null> {
  if (!mistralService.isConfigured()) {
    return null;
  }

  const targetLanguages = SUPPORTED_LOCALES.join(", ");

  const systemPrompt = `You are a translation assistant for "Watchr", a TV show and movie tracking app. Translate the user's comment to all supported languages. If the comment is already in a target language, return it unchanged for that language. Detect the source language.

Return ONLY a JSON object with this exact shape:
{ "detectedLanguage": "en", "en": "translation", "fr": "translation", "es": "translation", "pt": "translation", "de": "translation", "it": "translation", "ar": "translation" }

Rules:
- "detectedLanguage" must be one of: ${targetLanguages}
- Keep the tone and meaning of the original comment
- Do not translate proper nouns (show names, character names, actor names)
- Preserve any emojis or special characters
- Keep the translation concise and natural`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: content },
    ],
    model: "mistral-small-latest",
    temperature: 0.2,
    responseFormat: { type: "json_object" },
    maxTokens: 2000,
    feature: "comment_translation",
  });

  if (!result) {
    log("AICommentTranslation", "AI unavailable, skipping translation");
    return null;
  }

  try {
    const parsed = JSON.parse(result.content) as Record<string, string>;
    const detectedLanguage = parsed.detectedLanguage ?? "en";
    const translations: Record<string, string> = {};

    for (const locale of SUPPORTED_LOCALES) {
      const translated = parsed[locale];
      if (typeof translated === "string" && translated.length > 0) {
        translations[locale] = translated;
      }
    }

    if (Object.keys(translations).length === 0) {
      log("AICommentTranslation", "no valid translations returned");
      return null;
    }

    return { detectedLanguage, translations };
  } catch (err) {
    logError("AICommentTranslation", "parse error", err, { content: result.content.slice(0, 200) });
    return null;
  }
}

export async function translateCommentAsync(
  commentId: string,
  content: string,
): Promise<void> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return;
  }

  log("AICommentTranslation", "starting async translation", { commentId });

  try {
    const result = await translateCommentContent(content);
    if (!result) {
      return;
    }

    const translationsMap = new Map<string, string>();
    for (const [locale, text] of Object.entries(result.translations)) {
      translationsMap.set(locale, text);
    }

    await Comment.updateOne(
      { _id: commentId },
      {
        $set: {
          translations: translationsMap,
          originalLanguage: result.detectedLanguage,
        },
      },
    );

    log("AICommentTranslation", "translation stored", {
      commentId,
      detectedLanguage: result.detectedLanguage,
      locales: Object.keys(result.translations),
    });
  } catch (err) {
    logError("AICommentTranslation", "async translation failed", err, { commentId });
  }
}

export { isFeatureEnabled as isTranslationEnabled };
