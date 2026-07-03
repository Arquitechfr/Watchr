import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { processImport } from "../services/importParser.service.js";

let importQueue: Queue | null = null;

export function getImportQueue(): Queue {
  if (!importQueue) {
    importQueue = new Queue("import", { connection: redisConnection });
  }
  return importQueue;
}

export interface ImportJobData {
  userId: string;
  jobId: string;
  sourceFile: string;
}

export function createImportWorker(): Worker {
  return new Worker(
    "import",
    async (job) => {
      const { userId, jobId, sourceFile } = job.data as ImportJobData;
      await processImport(userId, jobId, sourceFile);
    },
    {
      connection: redisConnection,
      concurrency: 2,
      limiter: { max: 1, duration: 1000 },
    },
  );
}
