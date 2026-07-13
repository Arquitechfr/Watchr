import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { sendReengagementBatch } from "../services/aiReengagement.service.js";
import { log } from "../lib/logger.js";

export const reengagementQueue = new Queue("reengagement", { connection: redisConnection });

export async function scheduleReengagement(): Promise<void> {
  await reengagementQueue.add(
    "sendReengagementBatch",
    {},
    {
      repeat: { pattern: "0 10 * * *" },
      jobId: "reengagement-cron",
    },
  );
}

export function createReengagementWorker(): Worker {
  return new Worker(
    "reengagement",
    async (job) => {
      if (job.name !== "sendReengagementBatch") return;
      const result = await sendReengagementBatch();
      log("ReengagementWorker", "batch complete", result);
    },
    { connection: redisConnection, concurrency: 1 },
  );
}
