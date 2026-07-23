import { redisClient, isRedisAvailable } from "./redis.js";
import { env } from "../config/env.js";
import { logError } from "./logger.js";

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkAndConsumeMcpQuota(
  userId: string,
  plan: "free" | "vip",
): Promise<QuotaResult> {
  if (plan === "vip") {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const limit = env.MCP_FREE_DAILY_QUOTA;

  if (!isRedisAvailable()) {
    logError("McpQuota", "Redis unavailable, failing open", null);
    return { allowed: true, remaining: -1, limit };
  }

  const key = `mcp:quota:${userId}:${todayUTC()}`;
  const ttlSeconds = secondsUntilMidnightUTC();

  try {
    const result = await redisClient
      .multi()
      .incr(key)
      .expire(key, ttlSeconds, "NX")
      .exec();

    if (!result) {
      logError("McpQuota", "Redis exec returned null, failing open", null);
      return { allowed: true, remaining: -1, limit };
    }

    const [incrErr, incrValue] = result[0];
    if (incrErr) {
      logError("McpQuota", "INCR command failed in pipeline", incrErr);
      return { allowed: true, remaining: -1, limit };
    }
    const count = incrValue as number;

    if (count > limit) {
      return { allowed: false, remaining: 0, limit };
    }

    return { allowed: true, remaining: limit - count, limit };
  } catch (err) {
    logError("McpQuota", "Redis quota check failed, failing open", err);
    return { allowed: true, remaining: -1, limit };
  }
}
