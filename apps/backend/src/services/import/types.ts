import { WatchStatus } from "../../models/watchEntry.model.js";

export type ImportSource = "tvtime" | "trakt" | "imdb" | "letterboxd" | "watchr" | "unknown";

export interface ParsedRecord {
  title: string;
  year?: number;
  status?: string;
  rating?: number;
  season?: number;
  episode?: number;
  watchedAt?: string;
  type?: "tv" | "movie";
  imdbId?: string;
  tmdbId?: number;
}

export interface ImportResult {
  total: number;
  processed: number;
  matched: number;
  failed: number;
  errors: Array<{ line: number; reason: string }>;
}

export interface ImportOptions {
  source?: ImportSource;
}

export interface IParser {
  readonly source: ImportSource;
  detect(filePath: string): boolean;
  parse(filePath: string): ParsedRecord[];
  normalizeStatus(status?: string): WatchStatus | undefined;
}
