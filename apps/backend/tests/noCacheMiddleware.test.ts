import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { noCache } from "../src/middleware/noCache.middleware.js";

function makeRes(): Partial<Response> & { setHeader: ReturnType<typeof vi.fn> } {
  return { setHeader: vi.fn() };
}

describe("noCache middleware", () => {
  it("sets Cache-Control: no-store and calls next()", () => {
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    noCache({} as Request, res as unknown as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(next).toHaveBeenCalledTimes(1);
  });
});
