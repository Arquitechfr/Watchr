import { api } from "./api";

export type ExportFormat = "csv" | "json" | "trakt" | "imdb" | "letterboxd";

const FILENAMES: Record<ExportFormat, string> = {
  csv: "watchr-export.csv",
  json: "watchr-export.json",
  trakt: "watchr-trakt-export.json",
  imdb: "watchr-imdb-export.csv",
  letterboxd: "watchr-letterboxd-export.csv",
};

const MIME_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv",
  json: "application/json",
  trakt: "application/json",
  imdb: "text/csv",
  letterboxd: "text/csv",
};

export async function downloadExport(format: ExportFormat): Promise<void> {
  const response = await api.get(`/export/${format}`, { responseType: "blob" });
  const blob = new Blob([response.data], { type: MIME_TYPES[format] });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = FILENAMES[format];
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
