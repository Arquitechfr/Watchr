/* eslint-disable no-console */
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

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
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    if (env.NODE_ENV === "production") {
      console.error(`API error ${err.status} ${err.code}: ${err.message}`);
    } else {
      console.error(`API error ${err.status} ${err.code}: ${err.message}`, err.cause);
    }
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  console.error("Unhandled error:", err);
  const message = env.NODE_ENV === "production" ? "Internal server error" : err.message;
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  });
};
