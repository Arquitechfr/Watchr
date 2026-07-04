import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { BaseParser } from "./baseParser.js";
import { ParsedRecord, ImportSource } from "./types.js";

export class TvTimeParser extends BaseParser {
  readonly source: ImportSource = "tvtime";

  detect(filePath: string): boolean {
    if (filePath.endsWith(".zip")) return true;
    if (!filePath.endsWith(".csv")) return false;
    const header = this.getFirstLine(filePath).toLowerCase();
    return (
      header.includes("tracking-prod-records") ||
      header.includes("records-v2") ||
      (header.includes("title") &&
        (header.includes("status") || header.includes("watched") || header.includes("rating")))
    );
  }

  parse(filePath: string): ParsedRecord[] {
    const files = filePath.endsWith(".zip") ? this.extractZip(filePath) : [filePath];
    const allRecords: ParsedRecord[] = [];

    for (const file of files) {
      if (!file.endsWith(".csv")) continue;
      const variant = this.detectCsvVariant(file);
      if (variant === "unknown") continue;
      const records = this.parseCsv(file);
      allRecords.push(...records);
    }

    return allRecords;
  }

  private extractZip(zipPath: string): string[] {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "watchr-import-"));

    for (const entry of entries) {
      if (entry.entryName.endsWith(".csv")) {
        zip.extractEntryTo(entry, tempDir, false, true);
      }
    }

    return fs
      .readdirSync(tempDir)
      .filter((name) => name.endsWith(".csv"))
      .map((name) => path.join(tempDir, name));
  }

  private detectCsvVariant(filePath: string): "tracking" | "tracking-v2" | "unknown" {
    const header = this.getFirstLine(filePath).toLowerCase();
    if (header.includes("tracking-prod-records") || header.includes("records-v2")) {
      return "tracking-v2";
    }
    if (
      header.includes("title") &&
      (header.includes("status") || header.includes("watched") || header.includes("rating"))
    ) {
      return "tracking";
    }
    return "unknown";
  }

  private parseCsv(filePath: string): ParsedRecord[] {
    const rows = this.readCsv(filePath);
    return rows.map((row) => {
      const title = row["title"] || row["show_name"] || row["name"] || "";
      const year = row["year"] || row["release_year"] || row["first_air_year"] || "";
      const status = row["status"] || row["watch_status"] || row["tracking_status"] || "";
      const rating = row["rating"] || row["your_rating"] || row["score"] || "";
      const season = row["season"] || row["season_number"] || "";
      const episode = row["episode"] || row["episode_number"] || "";
      const watchedAt = row["watched_at"] || row["updated_at"] || row["date"] || "";

      return {
        title: title.trim(),
        year: year ? Number(year) : undefined,
        status: status.trim() || undefined,
        rating: rating ? Number(rating) : undefined,
        season: season ? Number(season) : undefined,
        episode: episode ? Number(episode) : undefined,
        watchedAt: watchedAt.trim() || undefined,
      };
    });
  }
}
