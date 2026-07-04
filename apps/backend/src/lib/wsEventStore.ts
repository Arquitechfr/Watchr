import { redisClient } from "./redis.js";
import { logError } from "./logger.js";

const EVENT_TTL_SECONDS = 24 * 60 * 60;
const MAX_EVENTS_PER_USER = 200;
const KEY_PREFIX = "ws:events:";

interface StoredEvent {
  timestamp: number;
  event: string;
  data: unknown;
}

export async function storeEvent(userId: string, event: string, data: unknown): Promise<void> {
  try {
    const key = `${KEY_PREFIX}${userId}`;
    const stored: StoredEvent = { timestamp: Date.now(), event, data };
    const json = JSON.stringify(stored);

    const pipeline = redisClient.multi();
    pipeline.zadd(key, stored.timestamp, json);
    pipeline.zremrangebyrank(key, 0, -MAX_EVENTS_PER_USER - 1);
    pipeline.expire(key, EVENT_TTL_SECONDS);
    await pipeline.exec();
  } catch (err) {
    logError("WsEventStore", "storeEvent failed", err, { userId, event });
  }
}

export async function getEventsSince(userId: string, timestamp: number): Promise<StoredEvent[]> {
  try {
    const key = `${KEY_PREFIX}${userId}`;
    const raw = await redisClient.zrangebyscore(key, timestamp, "+inf");
    return raw.map((entry) => JSON.parse(entry) as StoredEvent);
  } catch (err) {
    logError("WsEventStore", "getEventsSince failed", err, { userId, timestamp });
    return [];
  }
}

export function shouldStoreEvent(event: string): boolean {
  const userEvents = new Set([
    "import:progress",
    "notification:new",
    "tracking:updated",
    "upcoming:updated",
  ]);
  return userEvents.has(event);
}
