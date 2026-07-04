import { BaseParser } from "./baseParser.js";
import { ParsedRecord, ImportSource } from "./types.js";

const IMDB_TITLE_TYPE_MAP: Record<string, "tv" | "movie"> = {
  "tv series": "tv",
  "tv mini series": "tv",
  "tv episode": "tv",
  "tv special": "movie",
  "tv movie": "movie",
  "tv short": "movie",
  movie: "movie",
  video: "movie",
  short: "movie",
};

export class ImdbParser extends BaseParser {
  readonly source: ImportSource = "imdb";

  detect(filePath: string): boolean {
    if (!filePath.endsWith(".csv")) return false;
    const header = this.getFirstLine(filePath).toLowerCase();
    return (
      header.includes("const") &&
      header.includes("your rating") &&
      header.includes("title type")
    );
  }

  parse(filePath: string): ParsedRecord[] {
    const rows = this.readCsv(filePath);
    return rows
      .map((row) => this.parseRow(row))
      .filter((r) => r.title);
  }

  private parseRow(row: Record<string, string>): ParsedRecord {
    const title = row["Title"] || row["title"] || "";
    const year = row["Year"] || row["year"] || "";
    const rating = row["Your Rating"] || row["You Rated"] || row["your rating"] || "";
    const dateRated = row["Date Rated"] || row["Date Rated"] || row["created"] || "";
    const titleType = (row["Title Type"] || row["Title type"] || "").toLowerCase();
    const imdbId = row["Const"] || row["const"] || "";

    const type = IMDB_TITLE_TYPE_MAP[titleType];

    return {
      title: title.trim(),
      year: year ? Number(year) : undefined,
      rating: rating ? Number(rating) : undefined,
      watchedAt: dateRated.trim() || undefined,
      type,
      imdbId: imdbId.trim() || undefined,
    };
  }
}
