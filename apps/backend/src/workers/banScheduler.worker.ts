import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { executeBanAction } from "../services/admin/adminUser.service.js";
import { log } from "../lib/logger.js";

let banQueue: Queue | null = null;

function getBanQueue(): Queue {
  if (!banQueue) {
    banQueue = new Queue("ban-scheduler", { connection: redisConnection });
  }
  return banQueue;
}

export async function scheduleBanActionJob(actionId: string, delayMs: number): Promise<void> {
  const queue = getBanQueue();
  await queue.add(
    "execute-ban",
    { actionId },
    {
      delay: delayMs,
      jobId: `ban-action-${actionId}`,
      removeOnComplete: true,
      removeOnFail: 10,
    },
  );
}

export async function cancelBanActionJob(actionId: string): Promise<void> {
  const queue = getBanQueue();
  const job = await queue.getJob(`ban-action-${actionId}`);
  if (job) {
    await job.remove();
  }
}

export function createBanSchedulerWorker(): Worker {
  return new Worker(
    "ban-scheduler",
    async (job) => {
      if (job.name === "execute-ban") {
        const { actionId } = job.data as { actionId: string };
        log("BanScheduler", "executing ban action", { actionId });
        await executeBanAction(actionId);
      }
    },
    { connection: redisConnection },
  );
}
