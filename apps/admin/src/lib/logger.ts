interface LogMeta {
  [key: string]: unknown;
}

export function log(action: string, meta?: LogMeta): void {
  if (import.meta.env.MODE === "test") return;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ action, ...meta }));
}

export function logError(action: string, error: unknown, meta?: LogMeta): void {
  if (import.meta.env.MODE === "test") return;
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ action, error: message, ...meta }));
}

interface ApiErrorResponse {
  error?: { message?: string };
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: ApiErrorResponse } };
  return err?.response?.data?.error?.message ?? fallback;
}
