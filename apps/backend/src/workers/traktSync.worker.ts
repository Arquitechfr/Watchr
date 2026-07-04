import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { syncAllAutoSyncUsers } from "../services/trakt.service.js";
import { log } from "../lib/logger.js";

let traktSyncQueue: Queue | null = null;

export function getTraktSyncQueue(): Queue {
  if (!traktSyncQueue) {
    traktSyncQueue = new Queue("trakt-sync", { connection: redisConnection });
  }
  return traktSyncQueue;
}

export function createTraktSyncWorker(): Worker {
  return new Worker(
    "trakt-sync",
    async () => {
      log("TraktSyncWorker", "starting auto-sync batch");
      await syncAllAutoSyncUsers();
      log("TraktSyncWorker", "auto-sync batch completed");
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );
}

export async function scheduleTraktSync(): Promise<void> {
  const queue = getTraktSyncQueue();
  await queue.add(
    "auto-sync",
    {},
    {
      repeat: { pattern: "0 */6 * * *" },
      jobId: "trakt-auto-sync",
    },
  );
}
