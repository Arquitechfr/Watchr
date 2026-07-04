/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createNewsSyncWorker, scheduleNewsSync } from "./newsSync.worker.js";

async function main() {
  await connectDatabase();
  console.log("News sync worker connected to MongoDB");

  await scheduleNewsSync();
  const worker = createNewsSyncWorker();
  console.log("News sync worker started");

  worker.on("failed", (job, err) => {
    console.error(`News sync job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start news sync worker:", err);
  process.exit(1);
});
