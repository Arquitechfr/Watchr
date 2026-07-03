import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware.js";
import { verifyAccessToken } from "../services/auth.service.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(new ApiError(401, "UNAUTHORIZED", "Missing or invalid authorization header"));
    return;
  }

  const token = header.slice(7).trim();
  if (!token) {
    next(new ApiError(401, "UNAUTHORIZED", "Missing token"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new ApiError(401, "UNAUTHORIZED", "Invalid or expired access token"));
  }
}
