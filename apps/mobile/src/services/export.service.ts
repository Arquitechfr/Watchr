import { Platform } from "react-native";
import { log } from "../utils/logger";
import { api } from "./api";

export type ExportFormat = "csv" | "json" | "trakt" | "imdb" | "letterboxd";

export interface ExportOptions {
  includeRatings?: boolean;
  includeWatchlist?: boolean;
}

const FILENAMES: Record<ExportFormat, string> = {
  csv: "watchr-export.csv",
  json: "watchr-export.json",
  trakt: "watchr-trakt-export.json",
  imdb: "watchr-imdb-export.csv",
  letterboxd: "watchr-letterboxd-export.csv",
};

export async function downloadAndShareExport(format: ExportFormat, options?: ExportOptions): Promise<void> {
  log("ExportService", "downloadExport", { format, options });
  const params = new URLSearchParams();
  if (options?.includeRatings === false) params.set("includeRatings", "false");
  if (options?.includeWatchlist === false) params.set("includeWatchlist", "false");
  const queryString = params.toString();
  const url = `/export/${format}${queryString ? `?${queryString}` : ""}`;
  const response = await api.get(url, { responseType: "text" });
  const content = typeof response.data === "string" ? response.data : JSON.stringify(response.data);

  const filename = FILENAMES[format];
  const mimeType = format === "csv" || format === "imdb" || format === "letterboxd" ? "text/csv" : "application/json";

  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    log("ExportService", "web download triggered", { filename });
    return;
  }

  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  log("ExportService", "file written", { fileUri });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: "Watchr Export",
    });
  } else {
    log("ExportService", "sharing not available");
  }
}
