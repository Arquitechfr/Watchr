/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { connectRedis } from "../lib/redis.js";
import { createStatusMonitorWorker, scheduleStatusMonitor } from "./statusMonitor.worker.js";

async function main() {
  await connectDatabase();
  console.log("Status monitor worker connected to MongoDB");

  await connectRedis();
  console.log("Status monitor worker connected to Redis");

  await scheduleStatusMonitor();
  const worker = createStatusMonitorWorker();
  console.log("Status monitor worker started (cron: */30 * * * *)");

  worker.on("failed", (job, err) => {
    console.error(`Status monitor job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start status monitor worker:", err);
  process.exit(1);
});
