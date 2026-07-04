import { log } from "../utils/logger";
import { api } from "./api";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type ExportFormat = "csv" | "json" | "trakt" | "imdb" | "letterboxd";

const FILENAMES: Record<ExportFormat, string> = {
  csv: "watchr-export.csv",
  json: "watchr-export.json",
  trakt: "watchr-trakt-export.json",
  imdb: "watchr-imdb-export.csv",
  letterboxd: "watchr-letterboxd-export.csv",
};

export async function downloadAndShareExport(format: ExportFormat): Promise<void> {
  log("ExportService", "downloadExport", { format });
  const response = await api.get(`/export/${format}`, { responseType: "text" });
  const content = typeof response.data === "string" ? response.data : JSON.stringify(response.data);

  const filename = FILENAMES[format];
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  log("ExportService", "file written", { fileUri });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: format === "csv" || format === "imdb" || format === "letterboxd" ? "text/csv" : "application/json",
      dialogTitle: "Watchr Export",
    });
  } else {
    log("ExportService", "sharing not available");
  }
}
