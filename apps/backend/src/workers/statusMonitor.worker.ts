import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { runAllChecks, saveStatusSnapshot, isMonitorEnabled } from "../services/status.service.js";
import { log, logError } from "../lib/logger.js";

export const statusMonitorQueue = new Queue("status-monitor", { connection: redisConnection });

export async function scheduleStatusMonitor(): Promise<void> {
  await statusMonitorQueue.add(
    "runStatusCheck",
    {},
    {
      repeat: { pattern: "*/30 * * * *" },
      jobId: "status-monitor-cron",
    },
  );
}

export function createStatusMonitorWorker(): Worker {
  return new Worker(
    "status-monitor",
    async (job) => {
      if (job.name !== "runStatusCheck") return;

      try {
        const enabled = await isMonitorEnabled();
        if (!enabled) {
          log("StatusMonitorWorker", "skipped — monitor disabled");
          return;
        }
        const results = await runAllChecks();
        await saveStatusSnapshot(results);
        log("StatusMonitorWorker", "cycle completed", {
          services: results.map((r) => `${r.name}:${r.status}`).join(", "),
        });
      } catch (err) {
        logError("StatusMonitorWorker", "cycle failed", err);
      }
    },
    { connection: redisConnection, concurrency: 1 },
  );
}
