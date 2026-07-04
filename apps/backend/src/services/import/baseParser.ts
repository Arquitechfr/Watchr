import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { WatchStatus } from "../../models/watchEntry.model.js";
import { tmdbService } from "../tmdb.service.js";
import { Show } from "../../models/show.model.js";
import { sleep } from "../../lib/rateLimiter.js";
import { ShowDocument } from "../cacheShow.service.js";
import { scheduleShowRefresh } from "../../workers/episodeSync.worker.js";
import { ParsedRecord, IParser } from "./types.js";

export abstract class BaseParser implements IParser {
  abstract readonly source: import("./types.js").ImportSource;

  abstract detect(filePath: string): boolean;
  abstract parse(filePath: string): ParsedRecord[];

  normalizeStatus(status?: string): WatchStatus | undefined {
    const normalized = (status || "").toLowerCase().replace(/\s+/g, "_");
    const mapping: Record<string, WatchStatus> = {
      watching: "watching",
      completed: "completed",
      "plan_to_watch": "plan_to_watch",
      dropped: "dropped",
      watched: "completed",
      finished: "completed",
      on_hold: "plan_to_watch",
    };
    return mapping[normalized];
  }

  protected readCsv(filePath: string): Array<Record<string, string>> {
    const content = fs.readFileSync(filePath, "utf8");
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false,
    }) as Array<Record<string, string>>;
  }

  protected readJson(filePath: string): unknown {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  }

  protected getFirstLine(filePath: string): string {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    return lines.length > 0 ? lines[0] : "";
  }
}

export async function matchShow(
  record: ParsedRecord,
): Promise<{ show: ShowDocument; type: "tv" | "movie" } | null> {
  if (!record.title && !record.imdbId && !record.tmdbId) return null;

  if (record.tmdbId) {
    const type = record.type ?? "tv";
    return { show: await findOrCreateShow(record.tmdbId, type), type };
  }

  const query = record.year ? `${record.title} ${record.year}` : record.title;
  const tvResults = await tmdbService.searchShows(query);
  await sleep(250);
  const movieResults = await tmdbService.searchMovies(query);

  const tvMatch = tvResults[0];
  const movieMatch = movieResults[0];

  if (tvMatch && movieMatch) {
    const tvTitle = (tvMatch.name || tvMatch.title || "").toLowerCase();
    const movieTitle = (movieMatch.name || movieMatch.title || "").toLowerCase();
    const searchTitle = (record.title || "").toLowerCase();
    if (tvTitle === searchTitle && movieTitle !== searchTitle) {
      return { show: await findOrCreateShow(tvMatch.id, "tv"), type: "tv" };
    }
    if (movieTitle === searchTitle && tvTitle !== searchTitle) {
      return { show: await findOrCreateShow(movieMatch.id, "movie"), type: "movie" };
    }
    if (tvTitle !== movieTitle) {
      return null;
    }
  }

  if (tvMatch) {
    return { show: await findOrCreateShow(tvMatch.id, "tv"), type: "tv" };
  }

  if (movieMatch) {
    return { show: await findOrCreateShow(movieMatch.id, "movie"), type: "movie" };
  }

  return null;
}

async function findOrCreateShow(tmdbId: number, type: "tv" | "movie"): Promise<ShowDocument> {
  let show = await Show.findOne({ tmdbId });
  if (!show) {
    const details =
      type === "tv"
        ? await tmdbService.getTvDetails(tmdbId)
        : await tmdbService.getMovieDetails(tmdbId);
    const { upsertShowFromTmdb } = await import("../cacheShow.service.js");
    show = await upsertShowFromTmdb(type, details);
    if (type === "tv") {
      await scheduleShowRefresh(tmdbId);
    }
  }
  return show;
}

export async function extractImportFiles(zipPath: string): Promise<string[]> {
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
