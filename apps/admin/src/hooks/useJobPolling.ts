import { useState, useCallback, useRef, useEffect } from "react";
import api from "../lib/api";

export interface JobTranslation {
  subject?: string | null;
  htmlContent?: string | null;
  title?: string | null;
  body?: string | null;
}

export interface JobStatus {
  id: string;
  type: "email_broadcast" | "push_broadcast";
  status: "pending" | "processing" | "completed" | "failed";
  subject: string | null;
  title: string | null;
  body: string | null;
  htmlContent: string | null;
  target: "all" | "locale";
  locale: string | null;
  targetCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  sentBy: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  translations: Record<string, JobTranslation> | null;
  sourceLanguage: string | null;
  translationStatus: "pending" | "completed" | "failed" | "skipped" | null;
  createdAt: string;
  updatedAt: string;
}

interface UseJobPollingResult {
  job: JobStatus | null;
  isPolling: boolean;
  start: (jobId: string) => void;
  stop: () => void;
  error: string | null;
}

const POLL_INTERVAL_MS = 2000;

export function useJobPolling(): UseJobPollingResult {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async (jobId: string) => {
    try {
      const { data } = await api.get<JobStatus>(`/admin/jobs/${jobId}`);
      setJob(data);
      setError(null);
      if (data.status === "completed" || data.status === "failed") {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPolling(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job status");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    }
  }, []);

  const start = useCallback(
    (jobId: string) => {
      setJob(null);
      setError(null);
      setIsPolling(true);
      poll(jobId);
      intervalRef.current = setInterval(() => poll(jobId), POLL_INTERVAL_MS);
    },
    [poll],
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { job, isPolling, start, stop, error };
}
