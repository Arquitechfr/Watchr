import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { translate } from "../i18n/index.js";
import { logError } from "../lib/logger.js";

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{{${key}}}`,
  );
}

export class ApiError extends Error {
  public readonly params?: Record<string, string | number>;
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
    params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "ApiError";
    this.params = params;
  }
}

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const lang = req.language;
  if (err instanceof ApiError) {
    logError("ErrorMiddleware", `API error ${err.status} ${err.code}`, err, { path: req.path, method: req.method, cause: err.cause });
    const translated = translate(err.code, lang);
    const message = translated ? interpolate(translated, err.params) : err.message;
    res.status(err.status).json({
      error: {
        code: err.code,
        message,
      },
    });
    return;
  }

  logError("ErrorMiddleware", "Unhandled error", err, { path: req.path, method: req.method });
  const message = env.NODE_ENV === "production" ? translate("UNKNOWN", lang) : err.message;
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  });
};
