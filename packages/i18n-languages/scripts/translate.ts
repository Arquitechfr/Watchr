/**
 * Translation script for generating locale files.
 * Uses LibreTranslate (self-hosted at https://translate.watchr.me).
 *
 * Usage:
 *   pnpm --filter @watchr/i18n-languages translate --app mobile --target nl,pl,tr,ru,ja,ko,zh
 *   pnpm --filter @watchr/i18n-languages translate --app backend --target nl,pl,tr,ru,ja,ko,zh
 *   pnpm --filter @watchr/i18n-languages translate --app landing --target nl,pl,tr,ru,ja,ko,zh
 *
 * Env vars (loaded from packages/i18n-languages/.env):
 *   LIBRETRANSLATE_URL — LibreTranslate endpoint (default: https://translate.watchr.me/translate)
 *   LIBRETRANSLATE_KEY — API key for the instance
 *
 * ⚠️ This script must NOT be run without explicit user authorization.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

// Load .env file from package root (overrides existing env vars)
const envPath = resolve(import.meta.dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
}

interface TranslateOptions {
  app: "mobile" | "backend" | "landing";
  target: string[];
}

// LibreTranslate endpoint (self-hosted)
const LIBRETRANSLATE_ENDPOINT =
  process.env.LIBRETRANSLATE_URL ?? "https://translate.watchr.me/translate";

function getLibreTranslateKey(): string | undefined {
  return process.env.LIBRETRANSLATE_KEY;
}

// Brand names that must NOT be translated
const BRAND_NAMES = [
  "Watchr",
  "TMDB",
  "Google",
  "Trakt",
  "IMDb",
  "Letterboxd",
  "TV Time",
  "SIRET",
];

// Keys that must NOT be translated (keep English value as-is)
const DO_NOT_TRANSLATE_KEYS = new Set([
  "common.appName",
  "screens.home.title",
  "maintenance.title",
  "screens.export.watchrJson",
  "screens.export.watchrCsv",
  "screens.export.traktFormat",
  "screens.export.imdbFormat",
  "screens.export.letterboxdFormat",
  "profile.apiKeysQuickGuideExample",
  "screens.import.zipBadge",
  "screens.import.jsonBadge",
  "screens.import.csvBadge",
]);

// Protect template variables {{...}} and brand names before translation.
// Uses HTML <x id="N"></x> tags as opaque placeholders — LibreTranslate's
// format:"html" mode preserves HTML tags verbatim.
function protectText(text: string): { protected: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let result = text;
  let idx = 0;

  // Protect {{...}} template variables
  result = result.replace(/\{\{([^}]+)\}\}/g, (match) => {
    const id = idx;
    placeholders.set(`x${id}`, match);
    idx++;
    return `<x id="${id}"></x>`;
  });

  // Protect brand names (case-sensitive, whole word only)
  for (const brand of BRAND_NAMES) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, "g");
    result = result.replace(regex, (match) => {
      const id = idx;
      placeholders.set(`x${id}`, match);
      idx++;
      return `<x id="${id}"></x>`;
    });
  }

  return { protected: result, placeholders };
}

// Restore protected placeholders after translation.
// Finds <x id="N"></x> or <x id="N"/> tags and replaces with original content.
function restoreText(text: string, placeholders: Map<string, string>): string {
  let result = text;
  result = result.replace(/<x\s+id="(\d+)"\s*><\/x>|<x\s+id="(\d+)"\s*\/>/gi, (match, id1, id2) => {
    const id = id1 || id2;
    const original = placeholders.get(`x${id}`);
    return original ?? match;
  });
  return result;
}

function getLocaleDir(app: string): string {
  const repoRoot = resolve(import.meta.dirname, "..", "..", "..");
  const paths: Record<string, string> = {
    mobile: join(repoRoot, "apps", "mobile", "src", "i18n", "locales"),
    backend: join(repoRoot, "apps", "backend", "src", "i18n", "locales"),
    landing: join(repoRoot, "apps", "landing", "src", "i18n", "locales"),
  };
  const dir = paths[app];
  if (!dir) {
    console.error(`Unknown app: ${app}. Must be one of: mobile, backend, landing`);
    process.exit(1);
  }
  return dir;
}

function loadEnLocale(app: string): Record<string, unknown> {
  const dir = getLocaleDir(app);
  const enPath = join(dir, "en.ts");
  const content = readFileSync(enPath, "utf-8");

  // Extract the object literal from `const en = { ... };` — greedy match from first { to last }
  const match = content.match(/const\s+\w+\s*=\s*(\{[\s\S]*\})\s*;/);
  if (!match) {
    console.error(`Could not parse en.ts for app: ${app}`);
    process.exit(1);
  }

  // eslint-disable-next-line no-eval
  const obj = eval(`(${match[1]})`);
  return obj;
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      entries.push([fullKey, value]);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      entries.push(...flattenObject(value as Record<string, unknown>, fullKey));
    }
  }
  return entries;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function isValidIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

function formatKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key);
}

function objectToString(obj: Record<string, unknown>, indent = 2): string {
  const spaces = " ".repeat(indent);
  let result = "{\n";

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result += `${spaces}${formatKey(key)}: ${JSON.stringify(value)},\n`;
    } else if (typeof value === "object" && value !== null) {
      result += `${spaces}${formatKey(key)}: ${objectToString(value as Record<string, unknown>, indent + 2)},\n`;
    }
  }

  result += " ".repeat(indent - 2) + "}";
  return result;
}

async function translateText(
  text: string,
  targetLang: string,
  apiKey?: string,
): Promise<string> {
  const { protected: protectedText, placeholders } = protectText(text);

  const body: Record<string, string> = {
    q: protectedText,
    source: "en",
    target: targetLang,
    format: "html",
  };

  if (apiKey) {
    body.api_key = apiKey;
  }

  const res = await fetch(LIBRETRANSLATE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LibreTranslate error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { translatedText: string };
  const translated = data.translatedText ?? text;
  return restoreText(translated, placeholders);
}

async function translateBatch(
  texts: string[],
  targetLang: string,
  apiKey?: string,
  onBatchDone?: (translations: string[], startIdx: number) => void,
): Promise<string[]> {
  const results: string[] = [];
  const batchSize = 20;
  const delayMs = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((text) => translateText(text, targetLang, apiKey)),
    );
    results.push(...batchResults);

    if (onBatchDone) {
      onBatchDone(batchResults, i);
    }

    if (i + batchSize < texts.length) {
      if ((i + batchSize) % 100 === 0) {
        console.log(`  Translated ${i + batch.length}/${texts.length} strings...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

function loadCache(cachePath: string): Record<string, string> {
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  }
  return {};
}

async function main() {
  const { values } = parseArgs({
    options: {
      app: { type: "string" },
      target: { type: "string" },
    },
  });

  if (!values.app || !values.target) {
    console.error("Usage: translate --app <mobile|backend|landing> --target <lang1,lang2,...>");
    process.exit(1);
  }

  const app = values.app as TranslateOptions["app"];
  const targetLangs = values.target.split(",").map((l) => l.trim());
  const libreKey = getLibreTranslateKey();

  console.log(`\n=== Watchr Translation Script (LibreTranslate self-hosted) ===`);
  console.log(`App: ${app}`);
  console.log(`Target languages: ${targetLangs.join(", ")}`);
  console.log(`Endpoint: ${LIBRETRANSLATE_ENDPOINT}`);
  console.log(`API key: ${libreKey ? "✅ set" : "❌ missing"}`);
  console.log();

  const localeDir = getLocaleDir(app);
  const enObj = loadEnLocale(app);
  const flatEntries = flattenObject(enObj);
  const enStrings = flatEntries.map(([_, value]) => value);

  console.log(`Found ${flatEntries.length} strings to translate.\n`);

  for (const lang of targetLangs) {
    const outputPath = join(localeDir, `${lang}.ts`);
    const cachePath = join(localeDir, `.translate-cache-${lang}.json`);

    if (existsSync(outputPath)) {
      console.log(`[${lang}] File already exists, skipping. Delete it to re-translate.`);
      continue;
    }

    console.log(`[${lang}] Translating ${enStrings.length} strings...`);

    const cache = loadCache(cachePath);
    const uncachedIndices: number[] = [];
    const uncachedStrings: string[] = [];

    enStrings.forEach((str, i) => {
      const key = flatEntries[i][0];
      // Skip translation for excluded keys — use English value directly
      if (DO_NOT_TRANSLATE_KEYS.has(key)) {
        cache[str] = str;
        return;
      }
      if (cache[str]) {
        // Use cached translation
      } else {
        uncachedIndices.push(i);
        uncachedStrings.push(str);
      }
    });

    console.log(`[${lang}] ${uncachedStrings.length} new strings to translate (${enStrings.length - uncachedStrings.length} cached)`);

    if (uncachedStrings.length > 0) {
      let translatedCount = 0;
      const translations = await translateBatch(
        uncachedStrings,
        lang,
        libreKey,
        (batchTranslations, startIdx) => {
          // Save cache incrementally after each translation
          batchTranslations.forEach((tr, j) => {
            cache[uncachedStrings[startIdx + j]] = tr;
          });
          writeFileSync(cachePath, JSON.stringify(cache, null, 2));
          translatedCount += batchTranslations.length;
        },
      );

      // Final cache save
      writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    }

    const translatedObj: Record<string, unknown> = {};
    flatEntries.forEach(([key, _], i) => {
      const translated = cache[enStrings[i]] ?? enStrings[i];
      setNestedValue(translatedObj, key, translated);
    });

    const fileContent = `const ${lang} = ${objectToString(translatedObj)};\n\nexport default ${lang};\n`;
    writeFileSync(outputPath, fileContent, "utf-8");
    console.log(`[${lang}] ✅ Written to ${outputPath}\n`);
  }

  console.log("=== Done! ===");
  console.log("\n⚠️  Review the generated files manually. Auto-translations may need adjustments.");
  console.log("   Don't forget to add the new locale imports in the app's translations.ts/config.ts");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
