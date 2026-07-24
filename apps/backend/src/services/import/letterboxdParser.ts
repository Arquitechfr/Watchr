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
    const header = this.getFirstLine(filePath).toLowerCase();
    const hasRatingColumn = header.includes("rating");
    const hasWatchedDateColumn = header.includes("watched date");
    const hasRewatchColumn = header.includes("rewatch");
    const hasRatedAtColumn = header.includes("rated at");
    const hasTagsColumn = header.includes("tags");

    // L1: If no Tags column and no Rating column, it's likely watchlist.csv
    const isWatchlist = !hasTagsColumn && !hasRatingColumn && !hasWatchedDateColumn;

    return rows
      .map((row) => this.parseRow(row, { isWatchlist, hasWatchedDateColumn, hasRatedAtColumn, hasRewatchColumn, hasTagsColumn }))
      .filter((r) => r.title);
  }

  private parseRow(
    row: Record<string, string>,
    opts: { isWatchlist: boolean; hasWatchedDateColumn: boolean; hasRatedAtColumn: boolean; hasRewatchColumn: boolean; hasTagsColumn: boolean },
  ): ParsedRecord {
    const title = row["Name"] || row["name"] || "";
    const year = row["Year"] || row["year"] || "";
    const ratingStr = row["Rating"] || row["rating"] || "";

    // L3: Use "Watched Date" when available (diary.csv), otherwise "Date" (watched.csv)
    let watchedDate = "";
    if (opts.hasWatchedDateColumn) {
      watchedDate = row["Watched Date"] || row["watched date"] || row["Date"] || row["date"] || "";
    } else {
      watchedDate = row["Date"] || row["date"] || "";
    }

    // L2: For ratings.csv, use "Rated At" as the date
    if (!watchedDate && opts.hasRatedAtColumn) {
      watchedDate = row["Rated At"] || row["rated at"] || "";
    }

    const tags = opts.hasTagsColumn ? (row["Tags"] || row["tags"] || "") : "";

    let rating: number | undefined;
    if (ratingStr) {
      const parsed = Number(ratingStr);
      if (!isNaN(parsed)) {
        rating = parsed * 2; // Letterboxd uses 0.5-5 scale, Watchr uses 1-10
      }
    }

    // L1: Determine status — watchlist.csv has no Tags/Rating → plan_to_watch
    // Otherwise check tags for "watchlist"
    let status: string;
    if (opts.isWatchlist) {
      status = "plan_to_watch";
    } else if (tags.toLowerCase().includes("watchlist")) {
      status = "plan_to_watch";
    } else {
      status = "completed";
    }

    // L4: Extract rewatch
    let rewatch: boolean | undefined;
    if (opts.hasRewatchColumn) {
      const rewatchStr = (row["Rewatch"] || row["rewatch"] || "").toLowerCase();
      rewatch = rewatchStr === "yes" || rewatchStr === "true" || rewatchStr === "1";
    }

    return {
      title: title.trim(),
      year: year ? Number(year) : undefined,
      rating,
      watchedAt: watchedDate.trim() || undefined,
      type: "movie",
      status,
      rewatch,
    };
  }
}
