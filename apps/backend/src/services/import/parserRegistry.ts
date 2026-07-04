import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { BaseParser, matchShow, extractImportFiles } from "./baseParser.js";
import { ParsedRecord, ImportSource, IParser } from "./types.js";
import { TvTimeParser } from "./tvtimeParser.js";
import { TraktParser } from "./traktParser.js";
import { ImdbParser } from "./imdbParser.js";
import { LetterboxdParser } from "./letterboxdParser.js";

const parsers: IParser[] = [
  new TraktParser(),
  new ImdbParser(),
  new LetterboxdParser(),
  new TvTimeParser(),
];

export function detectSource(filePath: string): ImportSource {
  for (const parser of parsers) {
    if (parser.detect(filePath)) return parser.source;
  }
  return "unknown";
}

export function getParser(source: ImportSource): IParser | null {
  return parsers.find((p) => p.source === source) ?? null;
}

export function getParserForFile(filePath: string): IParser | null {
  for (const parser of parsers) {
    if (parser.detect(filePath)) return parser;
  }
  return null;
}

export function parseFile(filePath: string, source?: ImportSource): ParsedRecord[] {
  let parser: IParser | null = null;

  if (source && source !== "unknown") {
    parser = getParser(source);
  }

  if (!parser) {
    parser = getParserForFile(filePath);
  }

  if (!parser) {
    if (filePath.endsWith(".zip")) {
      return parseZip(filePath, source);
    }
    return [];
  }

  return parser.parse(filePath);
}

function parseZip(zipPath: string, source?: ImportSource): ParsedRecord[] {
  const files = extractZipFiles(zipPath);
  const allRecords: ParsedRecord[] = [];

  for (const file of files) {
    let parser: IParser | null = null;
    if (source && source !== "unknown") {
      parser = getParser(source);
    }
    if (!parser) {
      parser = getParserForFile(file);
    }
    if (parser) {
      allRecords.push(...parser.parse(file));
    }
  }

  return allRecords;
}

function extractZipFiles(zipPath: string): string[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "watchr-import-"));

  for (const entry of entries) {
    if (entry.entryName.endsWith(".csv") || entry.entryName.endsWith(".json")) {
      zip.extractEntryTo(entry, tempDir, false, true);
    }
  }

  return fs
    .readdirSync(tempDir)
    .filter((name) => name.endsWith(".csv") || name.endsWith(".json"))
    .map((name) => path.join(tempDir, name));
}

export { BaseParser, matchShow, extractImportFiles };
export { TvTimeParser, TraktParser, ImdbParser, LetterboxdParser };
