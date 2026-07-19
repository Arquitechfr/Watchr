import { Request, Response, NextFunction } from "express";

export function cookieParser(req: Request, _res: Response, next: NextFunction): void {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};

  if (cookieHeader) {
    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split("=");
      if (name && valueParts.length > 0) {
        req.cookies[name] = valueParts.join("=");
      }
    }
  }

  next();
}
