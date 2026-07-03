import { NextFunction, Request, Response } from "express";
import { normalizeLocale, SupportedLocale } from "../i18n/translations.js";

export function detectLanguage(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers["accept-language"];
  const raw = typeof header === "string" ? header : Array.isArray(header) ? header[0] : undefined;
  req.language = normalizeLocale(raw) as SupportedLocale;
  next();
}
