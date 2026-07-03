/* eslint-disable no-console */
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { translate } from "../i18n/index.js";

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
    if (env.NODE_ENV === "production") {
      console.error(`API error ${err.status} ${err.code}: ${err.message}`);
    } else {
      console.error(`API error ${err.status} ${err.code}: ${err.message}`, err.cause);
    }
    res.status(err.status).json({
      error: {
        code: err.code,
        message: translate(err.code, lang) ?? err.message,
      },
    });
    return;
  }

  console.error("Unhandled error:", err);
  const message = env.NODE_ENV === "production" ? translate("UNKNOWN", lang) : err.message;
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  });
};
