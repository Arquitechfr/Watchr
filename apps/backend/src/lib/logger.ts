export interface LogMeta {
  [key: string]: unknown;
}

export function log(service: string, action: string, meta?: LogMeta): void {
  if (process.env.NODE_ENV === "test") return;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ service, action, ...meta }));
}

export function logError(service: string, action: string, error: unknown, meta?: LogMeta): void {
  if (process.env.NODE_ENV === "test") return;
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ service, action, error: message, ...meta }));
}
