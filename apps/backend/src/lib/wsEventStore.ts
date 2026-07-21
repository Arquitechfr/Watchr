import { redisClient } from "./redis.js";
import { logError } from "./logger.js";

const EVENT_TTL_SECONDS = 24 * 60 * 60;
const MAX_EVENTS_PER_USER = 200;
const MAX_EVENTS_PER_SHOW = 200;
const KEY_PREFIX = "ws:events:";
const SHOW_KEY_PREFIX = "ws:events:show:";

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

export async function storeShowEvent(showId: string, event: string, data: unknown): Promise<void> {
  try {
    const key = `${SHOW_KEY_PREFIX}${showId}`;
    const stored: StoredEvent = { timestamp: Date.now(), event, data };
    const json = JSON.stringify(stored);

    const pipeline = redisClient.multi();
    pipeline.zadd(key, stored.timestamp, json);
    pipeline.zremrangebyrank(key, 0, -MAX_EVENTS_PER_SHOW - 1);
    pipeline.expire(key, EVENT_TTL_SECONDS);
    await pipeline.exec();
  } catch (err) {
    logError("WsEventStore", "storeShowEvent failed", err, { showId, event });
  }
}

export async function getShowEventsSince(showId: string, timestamp: number): Promise<StoredEvent[]> {
  try {
    const key = `${SHOW_KEY_PREFIX}${showId}`;
    const raw = await redisClient.zrangebyscore(key, timestamp, "+inf");
    return raw.map((entry) => JSON.parse(entry) as StoredEvent);
  } catch (err) {
    logError("WsEventStore", "getShowEventsSince failed", err, { showId, timestamp });
    return [];
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

const REPLAYABLE_USER_EVENTS = new Set([
  "import:progress",
  "notification:new",
  "tracking:updated",
  "upcoming:updated",
  "message:new",
  "message:updated",
  "message:deleted",
  "message:read",
  "message:reaction",
]);

const REPLAYABLE_SHOW_EVENTS = new Set([
  "comment:created",
  "comment:updated",
  "comment:deleted",
  "comment:liked",
  "comment:reaction",
  "show:updated",
]);

export function shouldStoreEvent(event: string): boolean {
  return REPLAYABLE_USER_EVENTS.has(event) || REPLAYABLE_SHOW_EVENTS.has(event);
}

export function shouldStoreUserEvent(event: string): boolean {
  return REPLAYABLE_USER_EVENTS.has(event);
}

export function shouldStoreShowEvent(event: string): boolean {
  return REPLAYABLE_SHOW_EVENTS.has(event);
}
