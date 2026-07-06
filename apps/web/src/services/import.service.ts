import { api } from "./api";

export type ImportSource = "tvtime" | "trakt" | "imdb" | "letterboxd" | "watchr" | "unknown";

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
  _id: string;
  sourceType: "series" | "movie";
  sourceTitle: string;
  sourceYear: number | null;
  candidates: ImportReviewCandidate[];
  status: "pending" | "resolved" | "skipped";
}

export interface ImportReviewsResponse {
  reviews: ImportReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export async function getImportReviews(jobId: string, page = 1, limit = 20): Promise<ImportReviewsResponse> {
  const response = await api.get<ImportReviewsResponse>(`/import/${jobId}/review`, {
    params: { page, limit },
  });
  return response.data;
}

export async function resolveImportReview(
  jobId: string,
  reviewId: string,
  tmdbId: number | null,
  skip: boolean,
): Promise<void> {
  await api.post(`/import/${jobId}/review/${reviewId}/resolve`, { tmdbId, skip });
}
