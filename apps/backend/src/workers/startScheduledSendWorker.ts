import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createScheduledSendWorker, scheduleScheduledSendChecker } from "./scheduledSend.worker.js";

async function main() {
  await connectDatabase();
  console.log("Scheduled send worker connected to MongoDB");

  await scheduleScheduledSendChecker();
  const worker = createScheduledSendWorker();
  console.log("Scheduled send worker started");

  worker.on("failed", (job, err) => {
    console.error(`Scheduled send job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start scheduled send worker:", err);
  process.exit(1);
});
