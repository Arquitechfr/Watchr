import { mistralService } from "./mistral.service.js";
import { log, logError } from "../lib/logger.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { Message } from "../models/message.model.js";
import { SUPPORTED_LOCALES } from "../i18n/translations.js";

async function isFeatureEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_message_translation_enabled" }).lean();
  return entry?.value === "true";
}

interface TranslationResult {
  detectedLanguage: string;
  translations: Record<string, string>;
}

export async function translateMessageContent(
  content: string,
): Promise<TranslationResult | null> {
  if (!mistralService.isConfigured()) {
    return null;
  }

  const targetLanguages = SUPPORTED_LOCALES.join(", ");

  const systemPrompt = `You are a translation assistant for "Watchr", a TV show and movie tracking app. Translate the user's message to all supported languages. If the message is already in a target language, return it unchanged for that language. Detect the source language.

Return ONLY a JSON object with this exact shape:
{ "detectedLanguage": "en", "en": "translation", "fr": "translation", "es": "translation", "pt": "translation", "de": "translation", "it": "translation", "ar": "translation" }

Rules:
- "detectedLanguage" must be one of: ${targetLanguages}
- Keep the tone and meaning of the original message
- Do not translate proper nouns (show names, character names, actor names)
- Preserve any emojis or special characters
- Keep the translation concise and natural`;

  const result = await mistralService.safeChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
    model: "mistral-small-latest",
    temperature: 0.2,
    responseFormat: { type: "json_object" },
    maxTokens: 8000,
    feature: "message_translation",
  });

  if (!result) {
    log("MessageTranslation", "AI unavailable, skipping translation");
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
      log("MessageTranslation", "no valid translations returned");
      return null;
    }

    return { detectedLanguage, translations };
  } catch (err) {
    logError("MessageTranslation", "parse error", err, { content: result.content.slice(0, 200) });
    return null;
  }
}

export async function translateMessageAsync(
  messageId: string,
  content: string,
): Promise<void> {
  const enabled = await isFeatureEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    return;
  }

  log("MessageTranslation", "starting async translation", { messageId });

  try {
    const result = await translateMessageContent(content);
    if (!result) {
      return;
    }

    const translationsMap = new Map<string, string>();
    for (const [locale, text] of Object.entries(result.translations)) {
      translationsMap.set(locale, text);
    }

    await Message.updateOne(
      { _id: messageId },
      {
        $set: {
          translations: translationsMap,
          originalLanguage: result.detectedLanguage,
        },
      },
    );

    log("MessageTranslation", "translation stored", {
      messageId,
      detectedLanguage: result.detectedLanguage,
      locales: Object.keys(result.translations),
    });
  } catch (err) {
    logError("MessageTranslation", "async translation failed", err, { messageId });
  }
}

export { isFeatureEnabled as isMessageTranslationEnabled };
