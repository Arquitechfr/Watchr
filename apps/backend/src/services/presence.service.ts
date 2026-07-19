import { setRedisValue, deleteRedisKey, getRedisValue, isRedisAvailable } from "../lib/redis.js";
import { logError } from "../lib/logger.js";

const PRESENCE_KEY_PREFIX = "presence:";
const PRESENCE_TTL_SECONDS = 30;

function presenceKey(userId: string): string {
  return `${PRESENCE_KEY_PREFIX}${userId}`;
}

export async function setOnline(userId: string): Promise<void> {
  try {
    await setRedisValue(presenceKey(userId), "1", PRESENCE_TTL_SECONDS);
  } catch (err) {
    logError("Presence", "setOnline failed", err, { userId });
  }
}

export async function setOffline(userId: string): Promise<void> {
  try {
    await deleteRedisKey(presenceKey(userId));
  } catch (err) {
    logError("Presence", "setOffline failed", err, { userId });
  }
}

export async function isOnline(userId: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  const val = await getRedisValue(presenceKey(userId));
  return val === "1";
}

export async function getOnlineStatus(userIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (!isRedisAvailable()) {
    for (const id of userIds) {
      result.set(id, false);
    }
    return result;
  }

  await Promise.all(
    userIds.map(async (id) => {
      const val = await getRedisValue(presenceKey(id));
      result.set(id, val === "1");
    }),
  );

  return result;
}

export async function heartbeat(userId: string): Promise<void> {
  await setOnline(userId);
}
