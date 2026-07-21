/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createModerationWorker } from "./moderation.worker.js";

async function main() {
  await connectDatabase();
  console.log("Moderation worker connected to MongoDB");

  const worker = createModerationWorker();
  console.log("Moderation worker started");

  worker.on("failed", (job, err) => {
    console.error(`Moderation job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start moderation worker:", err);
  process.exit(1);
});
