import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { log, logError } from "./logger.js";

const isTestEnv = env.NODE_ENV === "test";

function createRedisStub(): Redis {
  let pipelineStub: Record<string, () => unknown>;
  pipelineStub = new Proxy({} as Record<string, () => unknown>, {
    get(_t, prop: string) {
      if (prop === "exec") return () => Promise.resolve([]);
      return () => pipelineStub;
    },
  });
  return new Proxy({} as Redis, {
    get(_t, prop: string) {
      if (prop === "on") return () => {};
      if (prop === "connect") return () => Promise.resolve();
      if (prop === "multi") return () => pipelineStub;
      return () => Promise.resolve([] as unknown);
    },
  });
}

export const redisClient: Redis = isTestEnv
  ? createRedisStub()
  : new Redis({
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
  if (isTestEnv) return;
  try {
    await redisClient.connect();
    redisAvailable = true;
    log("Redis", "connected");
  } catch (err) {
    redisAvailable = false;
    logError("Redis", "connection failed", err);
  }
}

if (!isTestEnv) {
  redisClient.on("error", (err: Error) => {
    redisAvailable = false;
    logError("Redis", "error", err);
  });

  redisClient.on("connect", () => {
    redisAvailable = true;
    log("Redis", "connected");
  });
}

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
    let cursor = "0";
    do {
      const reply = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== "0");
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

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export async function deleteRedisKeyIfMatch(key: string, value: string): Promise<boolean> {
  if (!redisAvailable) return false;
  try {
    const result = await redisClient.eval(RELEASE_LOCK_SCRIPT, 1, key, value);
    return result === 1;
  } catch (err) {
    logError("Redis", "delete if match failed", err);
    return false;
  }
}
