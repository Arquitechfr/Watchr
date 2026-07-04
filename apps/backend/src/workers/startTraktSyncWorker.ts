/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createTraktSyncWorker, scheduleTraktSync } from "./traktSync.worker.js";

async function main() {
  await connectDatabase();
  console.log("Trakt sync worker connected to MongoDB");

  await scheduleTraktSync();
  console.log("Trakt sync scheduled job added");

  const worker = createTraktSyncWorker();
  console.log("Trakt sync worker started");

  worker.on("failed", (job, err) => {
    console.error(`Trakt sync job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start Trakt sync worker:", err);
  process.exit(1);
});
