import { api } from "./api";

export type ImportSource = "tvtime" | "trakt" | "imdb" | "letterboxd" | "watchr" | "unknown";

export interface TraktStatus {
  linked: boolean;
  traktUsername?: string;
  autoSync?: boolean;
  lastSyncAt?: string;
}

export interface ImportProgress {
  total: number;
  processed: number;
  matched: number;
  failed: number;
  pendingReview?: number;
}

export interface ImportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  source?: ImportSource;
  progress: ImportProgress;
  createdAt: string;
  completedAt?: string;
}

export interface ImportJobSummary {
  id: string;
  source?: ImportSource;
  status: "pending" | "processing" | "completed" | "failed";
  progress: ImportProgress;
  createdAt: string;
  completedAt?: string;
}

export interface ImportJobListResponse {
  jobs: ImportJobSummary[];
  total: number;
}

export interface ImportError {
  line: number;
  reason: string;
}

export interface ImportErrorsResponse {
  errors: ImportError[];
  total: number;
}

export interface ImportReviewCandidate {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  confidenceScore: number;
}

export interface ImportReviewItem {
  id: string;
  sourceType: "series" | "movie";
  sourceTitle: string;
  sourceYear: number | null;
  candidates: ImportReviewCandidate[];
}

export interface ImportReviewsResponse {
  reviews: ImportReviewItem[];
  total: number;
  pending: number;
}

export async function uploadImport(file: File, source: ImportSource): Promise<{ jobId: string; source: ImportSource }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", source);

  const response = await api.post<{ jobId: string; source: ImportSource }>("/import/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getImportJobStatus(jobId: string): Promise<ImportJob> {
  const response = await api.get<ImportJob>(`/import/${jobId}`);
  return response.data;
}

export async function getImportJobs(): Promise<ImportJobListResponse> {
  const response = await api.get<ImportJobListResponse>("/import");
  return response.data;
}

export async function getImportJobErrors(jobId: string): Promise<ImportErrorsResponse> {
  const response = await api.get<ImportErrorsResponse>(`/import/${jobId}/errors`);
  return response.data;
}

export async function getImportReviews(jobId: string): Promise<ImportReviewsResponse> {
  const response = await api.get<ImportReviewsResponse>(`/import/${jobId}/reviews`);
  return response.data;
}

export async function resolveImportReview(
  reviewId: string,
  tmdbId: number | null,
  skip: boolean,
): Promise<void> {
  await api.post(`/import/reviews/${reviewId}/resolve`, { tmdbId, skip });
}

export async function getTraktAuthUrl(): Promise<string> {
  const response = await api.get<{ url: string }>("/trakt/auth-url");
  return response.data.url;
}

export async function linkTraktAccount(code: string): Promise<TraktStatus> {
  const response = await api.post<TraktStatus>("/trakt/callback", { code });
  return response.data;
}

export async function getTraktStatus(): Promise<TraktStatus> {
  const response = await api.get<TraktStatus>("/trakt/status");
  return response.data;
}

export async function syncTrakt(): Promise<{ total: number; matched: number; failed: number }> {
  const response = await api.post<{ total: number; matched: number; failed: number }>("/trakt/sync");
  return response.data;
}

export async function unlinkTrakt(): Promise<void> {
  await api.delete("/trakt/unlink");
}

export async function toggleTraktAutoSync(enabled: boolean): Promise<TraktStatus> {
  const response = await api.put<TraktStatus>("/trakt/auto-sync", { enabled });
  return response.data;
}
