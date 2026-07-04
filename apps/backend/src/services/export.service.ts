import { Types } from "mongoose";
import { WatchEntry } from "../models/watchEntry.model.js";
import { Rating } from "../models/rating.model.js";
import { ApiError } from "../middleware/error.middleware.js";

export type ExportFormat = "csv" | "json" | "trakt" | "imdb" | "letterboxd";

interface LeanShow {
  _id: Types.ObjectId;
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  firstAirDate?: Date;
  runtime?: number;
  genres?: Array<{ id: number; name?: string }>;
  crew?: Array<{ id: number; name?: string; job?: string }>;
}

interface LeanWatchEntry {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  showId: LeanShow;
  status: string;
  watchedEpisodes: Array<{ season: number; episode: number; watchedAt: Date }>;
  currentSeason?: number;
  currentEpisode?: number;
  updatedAt: Date;
  createdAt: Date;
}

interface LeanRating {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  showId: Types.ObjectId;
  episodeRef?: { season: number; episode: number };
  value: number;
  updatedAt: Date;
}

interface ExportEntry {
  watchEntry: LeanWatchEntry;
  show: LeanShow;
  rating?: LeanRating;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(rows: Array<Record<string, string | number>>, columns: string[]): string {
  const header = columns.map(escapeCsv).join(",");
  const lines = rows.map((row) => columns.map((col) => escapeCsv(String(row[col] ?? ""))).join(","));
  return [header, ...lines].join("\n");
}

async function gatherExportData(userId: string): Promise<ExportEntry[]> {
  const watchEntries = await WatchEntry.find({ userId: new Types.ObjectId(userId) })
    .populate("showId")
    .lean() as unknown as LeanWatchEntry[];

  const ratings = await Rating.find({ userId: new Types.ObjectId(userId) }).lean() as unknown as LeanRating[];
  const ratingMap = new Map<string, LeanRating>();
  for (const rating of ratings) {
    const key = `${rating.showId.toString()}-${rating.episodeRef?.season ?? 0}-${rating.episodeRef?.episode ?? 0}`;
    ratingMap.set(key, rating);
  }

  const entries: ExportEntry[] = [];
  for (const we of watchEntries) {
    if (!we.showId || typeof we.showId === "string") continue;
    const show = we.showId as unknown as LeanShow;
    const ratingKey = `${show._id.toString()}-0-0`;
    entries.push({
      watchEntry: we,
      show,
      rating: ratingMap.get(ratingKey),
    });
  }

  return entries;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

function formatDateTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}

export async function exportToCsv(userId: string): Promise<string> {
  const entries = await gatherExportData(userId);
  const rows = entries.map((e) => ({
    title: e.show.title,
    type: e.show.type,
    tmdb_id: e.show.tmdbId,
    status: e.watchEntry.status,
    rating: e.rating?.value ?? "",
    year: e.show.firstAirDate ? new Date(e.show.firstAirDate).getFullYear() : "",
    watched_at: e.watchEntry.updatedAt ? formatDateTime(e.watchEntry.updatedAt) : "",
  }));

  return buildCsv(rows, ["title", "type", "tmdb_id", "status", "rating", "year", "watched_at"]);
}

export async function exportToJson(userId: string): Promise<string> {
  const entries = await gatherExportData(userId);
  const data = entries.map((e) => ({
    title: e.show.title,
    type: e.show.type,
    tmdbId: e.show.tmdbId,
    status: e.watchEntry.status,
    rating: e.rating?.value,
    watchedEpisodes: e.watchEntry.watchedEpisodes.map((ep) => ({
      season: ep.season,
      episode: ep.episode,
      watchedAt: ep.watchedAt,
    })),
    currentSeason: e.watchEntry.currentSeason,
    currentEpisode: e.watchEntry.currentEpisode,
    year: e.show.firstAirDate ? new Date(e.show.firstAirDate).getFullYear() : undefined,
  }));

  return JSON.stringify({ exportedAt: new Date().toISOString(), entries: data }, null, 2);
}

export async function exportToTraktJson(userId: string): Promise<string> {
  const entries = await gatherExportData(userId);
  const watched: Array<Record<string, unknown>> = [];
  const ratings: Array<Record<string, unknown>> = [];
  const watchlist: Array<Record<string, unknown>> = [];

  for (const e of entries) {
    const showData = {
      title: e.show.title,
      year: e.show.firstAirDate ? new Date(e.show.firstAirDate).getFullYear() : undefined,
      ids: { tmdb: e.show.tmdbId },
    };

    if (e.show.type === "tv") {
      if (e.watchEntry.status === "plan_to_watch") {
        watchlist.push({ listed_at: formatDateTime(e.watchEntry.updatedAt), type: "show", show: showData });
      } else {
        for (const ep of e.watchEntry.watchedEpisodes) {
          watched.push({
            watched_at: formatDateTime(ep.watchedAt),
            type: "episode",
            show: showData,
            episode: { season: ep.season, number: ep.episode },
          });
        }
        if (e.watchEntry.watchedEpisodes.length === 0 && e.watchEntry.status === "completed") {
          watched.push({ watched_at: formatDateTime(e.watchEntry.updatedAt), type: "show", show: showData });
        }
      }
    } else {
      if (e.watchEntry.status === "plan_to_watch") {
        watchlist.push({ listed_at: formatDateTime(e.watchEntry.updatedAt), type: "movie", movie: showData });
      } else {
        watched.push({ watched_at: formatDateTime(e.watchEntry.updatedAt), type: "movie", movie: showData });
      }
    }

    if (e.rating?.value) {
      const type = e.show.type === "tv" ? "show" : "movie";
      ratings.push({
        rated_at: formatDateTime(e.rating.updatedAt),
        rating: e.rating.value,
        type,
        [type]: showData,
      });
    }
  }

  return JSON.stringify({ watched, ratings, watchlist }, null, 2);
}

export async function exportToImdbCsv(userId: string): Promise<string> {
  const entries = await gatherExportData(userId);
  const rows = entries.map((e) => ({
    Const: "",
    "Your Rating": e.rating?.value ?? "",
    "Date Rated": e.rating ? formatDate(e.rating.updatedAt) : "",
    Title: e.show.title,
    "Original Title": "",
    URL: "",
    "Title Type": e.show.type === "tv" ? "TV Series" : "Movie",
    "IMDb Rating": "",
    "Runtime (mins)": e.show.runtime ?? "",
    Year: e.show.firstAirDate ? new Date(e.show.firstAirDate).getFullYear() : "",
    Genres: (e.show.genres ?? []).map((g) => g.name).join(", "),
    "Num Votes": "",
    "Release Date": e.show.firstAirDate ? formatDate(e.show.firstAirDate) : "",
    Directors: (e.show.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name).join(", "),
  }));

  return buildCsv(rows, ["Const", "Your Rating", "Date Rated", "Title", "Original Title", "URL", "Title Type", "IMDb Rating", "Runtime (mins)", "Year", "Genres", "Num Votes", "Release Date", "Directors"]);
}

export async function exportToLetterboxdCsv(userId: string): Promise<string> {
  const entries = await gatherExportData(userId);
  const movieEntries = entries.filter((e) => e.show.type === "movie");
  const rows = movieEntries.map((e) => ({
    Date: e.watchEntry.updatedAt ? formatDate(e.watchEntry.updatedAt) : "",
    Name: e.show.title,
    Year: e.show.firstAirDate ? new Date(e.show.firstAirDate).getFullYear() : "",
    "Letterboxd URI": "",
    Rating: e.rating?.value ? (e.rating.value / 2).toString() : "",
    "Watched Date": e.watchEntry.updatedAt ? formatDate(e.watchEntry.updatedAt) : "",
    Tags: "",
    Comments: "",
  }));

  return buildCsv(rows, ["Date", "Name", "Year", "Letterboxd URI", "Rating", "Watched Date", "Tags", "Comments"]);
}

export async function generateExport(userId: string, format: ExportFormat): Promise<{ content: string; contentType: string; filename: string }> {
  const exporters: Record<ExportFormat, (uid: string) => Promise<string>> = {
    csv: exportToCsv,
    json: exportToJson,
    trakt: exportToTraktJson,
    imdb: exportToImdbCsv,
    letterboxd: exportToLetterboxdCsv,
  };

  const contentTypes: Record<ExportFormat, string> = {
    csv: "text/csv",
    json: "application/json",
    trakt: "application/json",
    imdb: "text/csv",
    letterboxd: "text/csv",
  };

  const filenames: Record<ExportFormat, string> = {
    csv: "watchr-export.csv",
    json: "watchr-export.json",
    trakt: "watchr-trakt-export.json",
    imdb: "watchr-imdb-export.csv",
    letterboxd: "watchr-letterboxd-export.csv",
  };

  const exporter = exporters[format];
  if (!exporter) {
    throw new ApiError(400, "INVALID_EXPORT_FORMAT", `Unsupported export format: ${format}`);
  }

  const content = await exporter(userId);
  return {
    content,
    contentType: contentTypes[format],
    filename: filenames[format],
  };
}
