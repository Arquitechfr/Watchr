import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { sendActivationNudgeBatch } from "../services/activationNudge.service.js";
import { log } from "../lib/logger.js";

export const activationNudgeQueue = new Queue("activation-nudge", { connection: redisConnection });

export async function scheduleActivationNudge(): Promise<void> {
  await activationNudgeQueue.add(
    "sendActivationNudgeBatch",
    {},
    {
      repeat: { pattern: "0 */6 * * *" },
      jobId: "activation-nudge-cron",
    },
  );
}

export function createActivationNudgeWorker(): Worker {
  return new Worker(
    "activation-nudge",
    async (job) => {
      if (job.name !== "sendActivationNudgeBatch") return;
      const result = await sendActivationNudgeBatch();
      log("ActivationNudgeWorker", "batch complete", result);
    },
    { connection: redisConnection, concurrency: 1 },
  );
}
