import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { processImport } from "../services/importParser.service.js";
import { processTvTimeImport } from "../services/import/tvtime/tvtimeImport.service.js";
import { ImportSource } from "../services/import/types.js";

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
  source?: ImportSource;
}

export function createImportWorker(): Worker {
  return new Worker(
    "import",
    async (job) => {
      const { userId, jobId, sourceFile, source } = job.data as ImportJobData;
      if (source === "tvtime") {
        await processTvTimeImport(userId, jobId, sourceFile);
      } else {
        await processImport(userId, jobId, sourceFile, source);
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
      limiter: { max: 1, duration: 1000 },
    },
  );
}
