import { log } from "../utils/logger";
import { api } from "./api";

export interface ImportProgress {
  total: number;
  processed: number;
  matched: number;
  failed: number;
}

export interface ImportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: ImportProgress;
  createdAt: string;
  completedAt?: string;
}

export interface ImportError {
  line: number;
  reason: string;
}

export interface ImportErrorsResponse {
  errors: ImportError[];
  total: number;
}

export async function uploadImport(fileUri: string): Promise<{ jobId: string }> {
  log("ImportService", "uploadImport", { fileUri });
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: "export.zip",
    type: "application/zip",
  } as unknown as Blob);

  const response = await api.post<{ jobId: string }>("/import/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  log("ImportService", "uploadImport response", { jobId: response.data.jobId });
  return response.data;
}

export async function getImportJobStatus(jobId: string): Promise<ImportJob> {
  const response = await api.get<ImportJob>(`/import/${jobId}`);
  log("ImportService", "job status", { jobId, status: response.data.status, progress: response.data.progress });
  return response.data;
}

export async function getImportJobErrors(jobId: string): Promise<ImportErrorsResponse> {
  const response = await api.get<ImportErrorsResponse>(`/import/${jobId}/errors`);
  log("ImportService", "job errors", { jobId, total: response.data.total });
  return response.data;
}
