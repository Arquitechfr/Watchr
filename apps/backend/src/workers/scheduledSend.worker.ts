import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { AdminJob } from "../models/adminJob.model.js";
import { processJob } from "../services/admin/jobQueue.service.js";
import { log, logError } from "../lib/logger.js";

export const scheduledSendQueue = new Queue("scheduled-send", { connection: redisConnection });

export async function scheduleScheduledSendChecker(): Promise<void> {
  await scheduledSendQueue.add(
    "check-scheduled-jobs",
    {},
    {
      repeat: { pattern: "* * * * *" },
      jobId: "scheduled-send-checker",
    },
  );
}

async function processScheduledJobs(): Promise<void> {
  const now = new Date();
  const dueJobs = await AdminJob.find({
    status: "pending",
    scheduledStatus: "scheduled",
    scheduledAt: { $lte: now },
  }).limit(50);

  if (dueJobs.length === 0) return;

  log("ScheduledSendWorker", `found ${dueJobs.length} due jobs`);

  for (const job of dueJobs) {
    try {
      const updated = await AdminJob.findOneAndUpdate(
        { _id: job._id, status: "pending", scheduledStatus: "scheduled" },
        { $set: { scheduledStatus: "none" } },
        { new: true },
      );

      if (!updated) continue;

      processJob(job._id.toString()).catch((err) => {
        logError("ScheduledSendWorker", "failed to process due job", err, { jobId: job._id.toString() });
      });
    } catch (err) {
      logError("ScheduledSendWorker", "error processing due job", err, { jobId: job._id.toString() });
    }
  }
}

export function createScheduledSendWorker(): Worker {
  return new Worker(
    "scheduled-send",
    async (job) => {
      if (job.name !== "check-scheduled-jobs") return;
      await processScheduledJobs();
    },
    { connection: redisConnection, concurrency: 1 },
  );
}
