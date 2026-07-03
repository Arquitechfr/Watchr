import { Request, Response, NextFunction } from "express";
import { getRedisValue, setRedisValue } from "../lib/redis.js";

export function cacheResponse(ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = cacheKey(req);
    const cached = await getRedisValue(key);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(JSON.parse(cached));
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      res.setHeader("X-Cache", "MISS");
      void setRedisValue(key, JSON.stringify(body), ttlSeconds);
      return originalJson(body);
    };

    next();
  };
}

export function cacheKey(req: Request): string {
  return `api:${req.method}:${req.originalUrl || req.url}`;
}
