import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createScheduledSendWorker, scheduleScheduledSendChecker } from "./scheduledSend.worker.js";
import { log, logError } from "../lib/logger.js";

async function main() {
  await connectDatabase();
  log("ScheduledSendWorker", "connected to MongoDB");

  await scheduleScheduledSendChecker();
  const worker = createScheduledSendWorker();
  log("ScheduledSendWorker", "worker started");

  worker.on("failed", (job, err) => {
    logError("ScheduledSendWorker", `job ${job?.id} failed`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  logError("ScheduledSendWorker", "failed to start", err);
  process.exit(1);
});
