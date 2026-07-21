/**
 * MyMemory Translation script for generating locale files.
 *
 * Usage:
 *   pnpm --filter @watchr/i18n-languages translate --app mobile --target nl,pl,tr,ru,ja,ko,zh
 *   pnpm --filter @watchr/i18n-languages translate --app backend --target nl,pl,tr,ru,ja,ko,zh
 *   pnpm --filter @watchr/i18n-languages translate --app landing --target nl,pl,tr,ru,ja,ko,zh
 *
 * Optional: set MYMEMORY_EMAIL env var to increase daily limit (50000 words/day).
 * Without email: 5000 words/day.
 *
 * ⚠️ This script must NOT be run without explicit user authorization.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

interface TranslateOptions {
  app: "mobile" | "backend" | "landing";
  target: string[];
}

// MyMemory API endpoint
const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";

// Language code mapping for MyMemory
const LANG_MAP: Record<string, string> = {
  zh: "zh-CN",
};

function getEmail(): string | undefined {
  return process.env.MYMEMORY_EMAIL;
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

function objectToString(obj: Record<string, unknown>, indent = 2): string {
  const spaces = " ".repeat(indent);
  let result = "{\n";

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result += `${spaces}"${key}": ${JSON.stringify(value)},\n`;
    } else if (typeof value === "object" && value !== null) {
      result += `${spaces}"${key}": ${objectToString(value as Record<string, unknown>, indent + 2)},\n`;
    }
  }

  result = result.replace(/,\n$/, "\n");
  result += " ".repeat(indent - 2) + "}";
  return result;
}

async function translateText(
  text: string,
  targetLang: string,
  email?: string,
): Promise<string> {
  const lang = LANG_MAP[targetLang] ?? targetLang;
  const langPair = `en|${lang}`;

  const params = new URLSearchParams({
    q: text,
    langpair: langPair,
  });

  if (email) {
    params.set("de", email);
  }

  const res = await fetch(`${MYMEMORY_ENDPOINT}?${params.toString()}`);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MyMemory API error (${res.status}): ${errText}`);
  }

  const data = await res.json() as {
    responseData: { translatedText: string };
    responseStatus: number;
  };

  if (data.responseStatus !== 200) {
    throw new Error(`MyMemory API returned status ${data.responseStatus}`);
  }

  return data.responseData.translatedText ?? text;
}

async function translateWithRateLimit(
  texts: string[],
  targetLang: string,
  email?: string,
  batchSize = 5,
  delayMs = 1000,
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((text) => translateText(text, targetLang, email)),
    );
    results.push(...batchResults);

    if (i + batchSize < texts.length) {
      console.log(`  Translated ${i + batch.length}/${texts.length} strings...`);
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
  const email = getEmail();

  console.log(`\n=== Watchr Translation Script (MyMemory) ===`);
  console.log(`App: ${app}`);
  console.log(`Target languages: ${targetLangs.join(", ")}`);
  if (email) {
    console.log(`Email: ${email} (50000 words/day limit)`);
  } else {
    console.log(`No email set (5000 words/day limit). Set MYMEMORY_EMAIL env var for higher limit.`);
  }
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
      if (cache[str]) {
        // Use cached translation
      } else {
        uncachedIndices.push(i);
        uncachedStrings.push(str);
      }
    });

    console.log(`[${lang}] ${uncachedStrings.length} new strings to translate (${enStrings.length - uncachedStrings.length} cached)`);

    if (uncachedStrings.length > 0) {
      const translations = await translateWithRateLimit(uncachedStrings, lang, email);

      uncachedIndices.forEach((originalIdx, batchIdx) => {
        cache[enStrings[originalIdx]] = translations[batchIdx];
      });
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
