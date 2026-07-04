import { BaseParser } from "./baseParser.js";
import { ParsedRecord, ImportSource } from "./types.js";

export class LetterboxdParser extends BaseParser {
  readonly source: ImportSource = "letterboxd";

  detect(filePath: string): boolean {
    if (!filePath.endsWith(".csv")) return false;
    const header = this.getFirstLine(filePath).toLowerCase();
    return (
      header.includes("letterboxd uri") ||
      (header.includes("name") && header.includes("watched date")) ||
      (header.includes("date") && header.includes("name") && header.includes("year"))
    );
  }

  parse(filePath: string): ParsedRecord[] {
    const rows = this.readCsv(filePath);
    return rows
      .map((row) => this.parseRow(row))
      .filter((r) => r.title);
  }

  private parseRow(row: Record<string, string>): ParsedRecord {
    const title = row["Name"] || row["name"] || "";
    const year = row["Year"] || row["year"] || "";
    const ratingStr = row["Rating"] || row["rating"] || "";
    const watchedDate = row["Watched Date"] || row["watched date"] || row["Date"] || row["date"] || "";
    const tags = row["Tags"] || row["tags"] || "";

    let rating: number | undefined;
    if (ratingStr) {
      const parsed = Number(ratingStr);
      if (!isNaN(parsed)) {
        rating = parsed * 2;
      }
    }

    const status = tags.toLowerCase().includes("watchlist") ? "plan_to_watch" : "completed";

    return {
      title: title.trim(),
      year: year ? Number(year) : undefined,
      rating,
      watchedAt: watchedDate.trim() || undefined,
      type: "movie",
      status,
    };
  }
}
