import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { translate } from "../i18n/index.js";
import { logError } from "../lib/logger.js";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
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
    res.status(err.status).json({
      error: {
        code: err.code,
        message: translate(err.code, lang) ?? err.message,
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
