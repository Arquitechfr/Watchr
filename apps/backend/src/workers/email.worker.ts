import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { log } from "../lib/logger.js";

let emailQueue: Queue | null = null;

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  template: import("../models/emailLog.model.js").EmailTemplate;
  locale?: string;
  triggeredBy?: string;
}

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue("email", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return emailQueue;
}

export function createEmailWorker(sendFn: (params: EmailJobData) => Promise<void>): Worker {
  return new Worker(
    "email",
    async (job) => {
      const params = job.data as EmailJobData;
      log("EmailWorker", "processing job", { jobId: job.id, to: params.to, template: params.template });
      await sendFn(params);
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );
}
