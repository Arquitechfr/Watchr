import { createHash } from "crypto";
import { mistralService } from "./mistral.service.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getRedisValue, setRedisValue } from "../lib/redis.js";
import { log, logError } from "../lib/logger.js";
import { SUPPORTED_LOCALES, normalizeLocale } from "../i18n/translations.js";

export interface TranslationInput {
  subject?: string;
  body?: string;
  htmlContent?: string;
  title?: string;
}

export type TranslationResult = Map<string, TranslationInput>;

export type TranslationStatus = "pending" | "completed" | "failed" | "skipped";

const CACHE_TTL = 24 * 60 * 60;
const LANG_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  ar: "Arabic",
};

async function isAutoTranslateEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "ai_auto_translate_enabled" }).lean();
  return entry?.value === "true";
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function buildCacheKey(input: TranslationInput, targetLangs: string[]): string {
  const content = JSON.stringify(input);
  return `ai:translate:${hashContent(content)}:${targetLangs.join(",")}`;
}

export async function detectLanguage(text: string): Promise<string> {
  if (!mistralService.isConfigured()) {
    return "en";
  }

  const result = await mistralService.safeChat({
    messages: [
      {
        role: "user",
        content: `Detect the language of this text. Reply with only the ISO 639-1 code (e.g. "fr", "en", "es").\n\n${text.slice(0, 500)}`,
      },
    ],
    model: "mistral-small-latest",
    temperature: 0,
    maxTokens: 10,
    feature: "admin_translation",
  });

  if (!result) {
    return "en";
  }

  const detected = result.content.trim().toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(detected as (typeof SUPPORTED_LOCALES)[number]) ? detected : "en";
}

function buildTranslationPrompt(
  input: TranslationInput,
  targetLangs: string[],
  sourceLang?: string,
): string {
  const fields: string[] = [];
  if (input.subject !== undefined) {
    fields.push('  "subject": <translated subject as plain text>');
  }
  if (input.title !== undefined) {
    fields.push('  "title": <translated title as plain text>');
  }
  if (input.body !== undefined) {
    fields.push('  "body": <translated body as plain text>');
  }
  if (input.htmlContent !== undefined) {
    fields.push('  "htmlContent": <translated HTML content — preserve ALL HTML tags, attributes, and structure, only translate text between tags>');
  }

  const langList = targetLangs.map((l) => `"${l}"`).join(", ");
  const sourceHint = sourceLang ? `The source text is in ${LANG_NAMES[sourceLang] ?? sourceLang}.` : "Detect the source language automatically.";

  const inputJson = JSON.stringify(input);

  return `You are a professional translator. Translate the provided content into the following languages: ${langList}.
${sourceHint}

Return a JSON object where each key is a language code and the value is an object with the translated fields:
{
  "fr": {
${fields.join(",\n")}
  },
  "es": { ... },
  ...
}

Rules:
- Translate naturally and idiomatically for each language.
- For "subject", "title", "body": translate as plain text.
- For "htmlContent": preserve ALL HTML tags, attributes, inline styles, and links. Only translate the visible text between tags.
- Return ONLY the JSON object, no markdown, no explanation.

Input content:
${inputJson}`;
}

export async function translateMultiLang(
  input: TranslationInput,
  targetLangs: string[],
  sourceLang?: string,
): Promise<TranslationResult> {
  const result = new Map<string, TranslationInput>();

  if (targetLangs.length === 0) {
    return result;
  }

  const enabled = await isAutoTranslateEnabled();
  if (!enabled || !mistralService.isConfigured()) {
    log("TranslationService", "auto-translate disabled or Mistral not configured");
    return result;
  }

  const cacheKey = buildCacheKey(input, targetLangs);
  const cached = await getRedisValue(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as Record<string, TranslationInput>;
      for (const [lang, translation] of Object.entries(parsed)) {
        result.set(lang, translation);
      }
      log("TranslationService", "cache hit", { langs: Array.from(result.keys()) });
      return result;
    } catch {
      // Cache corrupt, proceed
    }
  }

  const prompt = buildTranslationPrompt(input, targetLangs, sourceLang);

  const aiResult = await mistralService.safeChatWithFallback({
    messages: [{ role: "user", content: prompt }],
    model: "mistral-small-latest",
    fallbackModel: "mistral-large-latest",
    temperature: 0.2,
    responseFormat: { type: "json_object" },
    maxTokens: 4000,
    feature: "admin_translation",
  });

  if (!aiResult) {
    logError("TranslationService", "AI translation failed, no result");
    return result;
  }

  try {
    const parsed = JSON.parse(aiResult.content) as Record<string, TranslationInput>;

    for (const lang of targetLangs) {
      const translation = parsed[lang];
      if (translation && typeof translation === "object") {
        const clean: TranslationInput = {};
        if (input.subject !== undefined && typeof translation.subject === "string") {
          clean.subject = translation.subject;
        }
        if (input.title !== undefined && typeof translation.title === "string") {
          clean.title = translation.title;
        }
        if (input.body !== undefined && typeof translation.body === "string") {
          clean.body = translation.body;
        }
        if (input.htmlContent !== undefined && typeof translation.htmlContent === "string") {
          clean.htmlContent = translation.htmlContent;
        }

        if (Object.keys(clean).length > 0) {
          result.set(lang, clean);
        }
      }
    }

    if (result.size > 0) {
      const cacheData: Record<string, TranslationInput> = {};
      for (const [lang, translation] of result) {
        cacheData[lang] = translation;
      }
      await setRedisValue(cacheKey, JSON.stringify(cacheData), CACHE_TTL);
    }

    log("TranslationService", "translation complete", {
      requested: targetLangs.length,
      succeeded: result.size,
      langs: Array.from(result.keys()),
    });
  } catch (err) {
    logError("TranslationService", "failed to parse translation response", err, {
      content: aiResult.content.slice(0, 200),
    });
  }

  return result;
}

export async function translateForUser(
  input: TranslationInput,
  userLocale: string | undefined,
  sourceLang?: string,
): Promise<TranslationInput> {
  if (!userLocale) {
    return input;
  }

  const normalized = normalizeLocale(userLocale);
  if (sourceLang && normalized === sourceLang) {
    return input;
  }

  const translations = await translateMultiLang(input, [normalized], sourceLang);
  const translated = translations.get(normalized);

  return translated ?? input;
}
