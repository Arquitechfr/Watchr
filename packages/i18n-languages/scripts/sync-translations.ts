/**
 * Incremental sync script for locale files.
 * Compares en.ts (source of truth) with each target locale, translates
 * only missing keys via LibreTranslate, removes obsolete keys, and
 * preserves existing translations.
 *
 * Usage:
 *   pnpm --filter @watchr/i18n-languages sync --app mobile
 *   pnpm --filter @watchr/i18n-languages sync --app mobile --target fr,es
 *   pnpm --filter @watchr/i18n-languages sync --app mobile --dry-run
 *
 * Env vars (loaded from packages/i18n-languages/.env):
 *   LIBRETRANSLATE_URL — LibreTranslate endpoint (default: https://translate.watchr.me/translate)
 *   LIBRETRANSLATE_KEY — API key for the instance
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

// Load .env file from package root
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

const ALL_LANGS = [
  "fr", "es", "pt", "de", "it", "ar",
  "nl", "pl", "tr", "ru", "ja", "ko", "zh",
];

// ─── Shared helpers (kept in sync with translate.ts) ───

function protectText(text: string): { protected: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let result = text;
  let idx = 0;

  result = result.replace(/\{\{([^}]+)\}\}/g, (match) => {
    const id = idx;
    placeholders.set(`x${id}`, match);
    idx++;
    return `<x id="${id}"></x>`;
  });

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

function loadLocaleFile(filePath: string, langForError: string): Record<string, unknown> {
  const content = readFileSync(filePath, "utf-8");
  const match = content.match(/const\s+\w+\s*=\s*(\{[\s\S]*\})\s*;/);
  if (!match) {
    console.error(`Could not parse ${filePath} for lang: ${langForError}`);
    process.exit(1);
  }
  // eslint-disable-next-line no-eval
  return eval(`(${match[1]})`);
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

function buildMergedObject(
  enObj: Record<string, unknown>,
  existingFlat: Map<string, string>,
  newTranslations: Map<string, string>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, enValue] of Object.entries(enObj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof enValue === "string") {
      if (newTranslations.has(fullKey)) {
        result[key] = newTranslations.get(fullKey)!;
      } else if (existingFlat.has(fullKey)) {
        result[key] = existingFlat.get(fullKey)!;
      } else {
        result[key] = enValue;
      }
    } else if (typeof enValue === "object" && enValue !== null && !Array.isArray(enValue)) {
      result[key] = buildMergedObject(
        enValue as Record<string, unknown>,
        existingFlat,
        newTranslations,
        fullKey,
      );
    }
  }
  return result;
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
        console.log(`    Translated ${i + batch.length}/${texts.length} strings...`);
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

// ─── Main sync logic ───

async function main() {
  const { values } = parseArgs({
    options: {
      app: { type: "string" },
      target: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  if (!values.app) {
    console.error("Usage: sync --app <mobile|backend|landing> [--target <lang1,lang2,...>] [--dry-run]");
    process.exit(1);
  }

  const app = values.app as "mobile" | "backend" | "landing";
  const targetLangs = values.target
    ? values.target.split(",").map((l) => l.trim())
    : ALL_LANGS;
  const dryRun = values["dry-run"] ?? false;
  const libreKey = getLibreTranslateKey();

  console.log(`\n=== Watchr i18n Sync (LibreTranslate self-hosted) ===`);
  console.log(`App: ${app}`);
  console.log(`Target languages: ${targetLangs.join(", ")}`);
  console.log(`Endpoint: ${LIBRETRANSLATE_ENDPOINT}`);
  console.log(`API key: ${libreKey ? "✅ set" : "❌ missing"}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no files written)" : "WRITE"}`);
  console.log();

  const localeDir = getLocaleDir(app);
  const enObj = loadLocaleFile(join(localeDir, "en.ts"), "en");
  const enFlat = flattenObject(enObj);
  const enKeyToValue = new Map<string, string>(enFlat);

  console.log(`Source of truth: en.ts — ${enFlat.length} keys\n`);

  let totalMissing = 0;
  let totalObsolete = 0;
  let totalPreserved = 0;
  let totalTranslated = 0;

  for (const lang of targetLangs) {
    const outputPath = join(localeDir, `${lang}.ts`);
    const cachePath = join(localeDir, `.translate-cache-${lang}.json`);

    if (!existsSync(outputPath)) {
      console.log(`[${lang}] ⚠️  File does not exist — creating from scratch.`);
    }

    // Load existing locale (or empty if creating from scratch)
    const existingObj: Record<string, unknown> = existsSync(outputPath)
      ? loadLocaleFile(outputPath, lang)
      : {};
    const existingFlat = flattenObject(existingObj);
    const existingKeyToValue = new Map<string, string>(existingFlat);

    // Compute diff
    const enKeys = new Set(enKeyToValue.keys());
    const existingKeys = new Set(existingKeyToValue.keys());

    const missingKeys = enFlat.filter(([key]) => !existingKeys.has(key));
    const obsoleteKeys = existingFlat.filter(([key]) => !enKeys.has(key));
    const preservedKeys = enFlat.filter(([key]) => existingKeys.has(key));

    totalMissing += missingKeys.length;
    totalObsolete += obsoleteKeys.length;
    totalPreserved += preservedKeys.length;

    console.log(
      `[${lang}] +${missingKeys.length} missing, -${obsoleteKeys.length} obsolete, ${preservedKeys.length} preserved`,
    );

    if (obsoleteKeys.length > 0) {
      for (const [key] of obsoleteKeys) {
        console.log(`  🔴 obsolete: ${key}`);
      }
    }

    if (missingKeys.length > 0) {
      for (const [key] of missingKeys) {
        console.log(`  🟡 missing: ${key}`);
      }
    }

    if (dryRun) {
      console.log(`[${lang}] (dry-run) skipping translation and write\n`);
      continue;
    }

    // Translate missing keys
    const cache = loadCache(cachePath);
    const stringsToTranslate: string[] = [];
    const translateMeta: Array<{ key: string; enValue: string; useEnglish: boolean }> = [];

    for (const [key, enValue] of missingKeys) {
      if (DO_NOT_TRANSLATE_KEYS.has(key)) {
        translateMeta.push({ key, enValue, useEnglish: true });
        cache[enValue] = enValue;
        continue;
      }
      if (cache[enValue]) {
        translateMeta.push({ key, enValue, useEnglish: false });
        continue;
      }
      translateMeta.push({ key, enValue, useEnglish: false });
      stringsToTranslate.push(enValue);
    }

    if (stringsToTranslate.length > 0) {
      console.log(`  Translating ${stringsToTranslate.length} new strings via LibreTranslate...`);
      const translations = await translateBatch(
        stringsToTranslate,
        lang,
        libreKey,
        (batchTranslations, startIdx) => {
          batchTranslations.forEach((tr, j) => {
            cache[stringsToTranslate[startIdx + j]] = tr;
          });
          writeFileSync(cachePath, JSON.stringify(cache, null, 2));
        },
      );
      writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      totalTranslated += stringsToTranslate.length;
    }

    // Build merged object: preserved + translated missing - obsolete
    // Uses recursive merge to preserve en.ts structure (fixes keys with dots)
    const newTranslations = new Map<string, string>();
    for (const { key, enValue, useEnglish } of translateMeta) {
      let translated: string;
      if (useEnglish) {
        translated = enValue;
      } else if (cache[enValue]) {
        translated = cache[enValue];
      } else {
        // Should not happen, but fallback to English
        translated = enValue;
      }
      newTranslations.set(key, translated);
    }

    const mergedObj = buildMergedObject(enObj, existingKeyToValue, newTranslations);

    // Write the file
    const fileContent = `const ${lang} = ${objectToString(mergedObj)};\n\nexport default ${lang};\n`;
    writeFileSync(outputPath, fileContent, "utf-8");
    console.log(`[${lang}] ✅ Synced ${outputPath}\n`);
  }

  console.log("=== Sync complete! ===");
  console.log(`Summary: ${totalMissing} missing translated, ${totalObsolete} obsolete removed, ${totalPreserved} preserved`);
  if (dryRun) {
    console.log("\n⚠️  Dry run — no files were written. Run without --dry-run to apply changes.");
  } else {
    console.log("\n⚠️  Review the synced files. Auto-translations may need manual adjustments.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
