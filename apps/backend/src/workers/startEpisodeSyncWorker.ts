/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createEpisodeSyncWorker, scheduleEpisodeSync } from "./episodeSync.worker.js";

async function main() {
  await connectDatabase();
  console.log("Episode sync worker connected to MongoDB");

  await scheduleEpisodeSync();
  const worker = createEpisodeSyncWorker();
  console.log("Episode sync worker started");

  worker.on("failed", (job, err) => {
    console.error(`Episode sync job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start episode sync worker:", err);
  process.exit(1);
});
