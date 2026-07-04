import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { log, logError } from "./logger.js";

export const redisClient = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

let redisAvailable = false;

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function connectRedis(): Promise<void> {
  if (redisAvailable) return;
  try {
    await redisClient.connect();
    redisAvailable = true;
    log("Redis", "connected");
  } catch (err) {
    redisAvailable = false;
    logError("Redis", "connection failed", err);
  }
}

redisClient.on("error", (err: Error) => {
  redisAvailable = false;
  logError("Redis", "error", err);
});

redisClient.on("connect", () => {
  redisAvailable = true;
  log("Redis", "connected");
});

export async function getRedisValue(key: string): Promise<string | null> {
  if (!redisAvailable) return null;
  try {
    return await redisClient.get(key);
  } catch (err) {
    logError("Redis", "get failed", err);
    return null;
  }
}

export async function setRedisValue(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!redisAvailable) return;
  try {
    await redisClient.setex(key, ttlSeconds, value);
  } catch (err) {
    logError("Redis", "set failed", err);
  }
}

export async function invalidateRedisPattern(pattern: string): Promise<void> {
  if (!redisAvailable) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    logError("Redis", "invalidate failed", err);
  }
}

export async function deleteRedisKey(key: string): Promise<void> {
  if (!redisAvailable) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    logError("Redis", "delete failed", err);
  }
}
