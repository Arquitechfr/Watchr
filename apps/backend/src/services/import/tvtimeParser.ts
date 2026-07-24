import * as fs from "fs";
import { BaseParser } from "./baseParser.js";
import { ParsedRecord, ImportSource } from "./types.js";
import { parseTrackingRecordsV2 } from "./tvtime/parseTvTimeExport.js";

export class TvTimeParser extends BaseParser {
  readonly source: ImportSource = "tvtime";

  detect(filePath: string): boolean {
    if (filePath.endsWith(".zip")) return true;
    if (filePath.endsWith(".json")) {
      // T1: New TV Time JSON format
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(content);
        if (Array.isArray(data) || (data && typeof data === "object")) {
          return true;
        }
      } catch {
        return false;
      }
    }
    if (!filePath.endsWith(".csv")) return false;
    const header = this.getFirstLine(filePath).toLowerCase();
    return (
      header.includes("tracking-prod-records") ||
      header.includes("records-v2") ||
      header.includes("user-series-") ||
      header.includes("watch-episode-") ||
      header.includes("rewatch-episode-") ||
      (header.includes("title") &&
        (header.includes("status") || header.includes("watched") || header.includes("rating")))
    );
  }

  parse(filePath: string): ParsedRecord[] {
    // This synchronous method is kept for IParser compatibility.
    // The full async pipeline is handled by tvtimeImport.service.ts via the worker.
    // For the registry's synchronous path, we do a best-effort parse from the CSV directly.
    if (filePath.endsWith(".zip")) {
      // Can't do async zip extraction in sync context — return empty.
      // The worker handles zip files via processTvTimeImport.
      return [];
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const parsed = parseTrackingRecordsV2(buffer);
      const records: ParsedRecord[] = [];

      for (const s of parsed.series) {
        records.push({
          title: s.title,
          year: s.year ?? undefined,
          status: s.isFollowed ? "watching" : s.isForLater ? "plan_to_watch" : undefined,
          type: "tv",
        });
      }

      for (const m of parsed.movies) {
        records.push({
          title: m.title,
          year: m.year ?? undefined,
          status: "completed",
          type: "movie",
        });
      }

      for (const ep of parsed.episodes) {
        records.push({
          title: ep.title,
          year: ep.year ?? undefined,
          season: ep.seasonNumber,
          episode: ep.episodeNumber,
          watchedAt: ep.createdAt.toISOString(),
          type: "tv",
        });
      }

      return records;
    } catch {
      return [];
    }
  }
}
