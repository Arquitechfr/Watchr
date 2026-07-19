import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const logSpy = vi.fn();
const logErrorSpy = vi.fn();

vi.mock("../src/lib/logger.js", () => ({
  log: (...args: unknown[]) => logSpy(...args),
  logError: (...args: unknown[]) => logErrorSpy(...args),
}));

vi.mock("../src/config/env.js", () => ({
  env: { NODE_ENV: "production" },
}));

vi.mock("../src/services/errorTracking.service.js", () => ({
  captureBackendError: () => Promise.resolve(),
}));

vi.mock("../src/i18n/index.js", () => ({
  translate: (code: string) => `translated:${code}`,
}));

const { errorMiddleware, ApiError } = await import("../src/middleware/error.middleware.js");

function makeReq(): Partial<Request> {
  return { path: "/api/test", method: "GET", language: "en" };
}

function makeRes(): Partial<Response> {
  const res: Partial<Response> & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res;
}

describe("errorMiddleware logging", () => {
  beforeEach(() => {
    logSpy.mockClear();
    logErrorSpy.mockClear();
  });

  it("uses log() (info) for INVALID_TOKEN", () => {
    const err = new ApiError(401, "INVALID_TOKEN", "Invalid or expired token.");
    errorMiddleware(err, makeReq() as Request, makeRes() as Response, vi.fn() as NextFunction);
    expect(logSpy).toHaveBeenCalledWith("ErrorMiddleware", "API 401 INVALID_TOKEN", { path: "/api/test", method: "GET" });
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("uses log() (info) for MISSING_TOKEN", () => {
    const err = new ApiError(401, "MISSING_TOKEN", "Missing token");
    errorMiddleware(err, makeReq() as Request, makeRes() as Response, vi.fn() as NextFunction);
    expect(logSpy).toHaveBeenCalledWith("ErrorMiddleware", "API 401 MISSING_TOKEN", { path: "/api/test", method: "GET" });
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("uses log() (info) for UNAUTHORIZED", () => {
    const err = new ApiError(401, "UNAUTHORIZED", "Unauthorized");
    errorMiddleware(err, makeReq() as Request, makeRes() as Response, vi.fn() as NextFunction);
    expect(logSpy).toHaveBeenCalledWith("ErrorMiddleware", "API 401 UNAUTHORIZED", { path: "/api/test", method: "GET" });
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("uses logError() for non-auth ApiError codes (e.g. VALIDATION_ERROR)", () => {
    const err = new ApiError(400, "VALIDATION_ERROR", "Bad request");
    errorMiddleware(err, makeReq() as Request, makeRes() as Response, vi.fn() as NextFunction);
    expect(logErrorSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("uses logError() for unhandled (non-ApiError) errors", () => {
    const err = new Error("Something went wrong");
    errorMiddleware(err, makeReq() as Request, makeRes() as Response, vi.fn() as NextFunction);
    expect(logErrorSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
