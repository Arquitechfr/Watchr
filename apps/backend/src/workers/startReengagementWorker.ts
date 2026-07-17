/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createReengagementWorker, scheduleReengagement } from "./reengagement.worker.js";

async function main() {
  await connectDatabase();
  console.log("Reengagement worker connected to MongoDB");

  await scheduleReengagement();
  const worker = createReengagementWorker();
  console.log("Reengagement worker started");

  worker.on("failed", (job, err) => {
    console.error(`Reengagement job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start reengagement worker:", err);
  process.exit(1);
});
