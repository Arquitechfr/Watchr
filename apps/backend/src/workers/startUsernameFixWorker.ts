/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createUsernameFixWorker, scheduleUsernameFix } from "./usernameFix.worker.js";

async function main() {
  await connectDatabase();
  console.log("Username fix worker connected to MongoDB");

  await scheduleUsernameFix();
  console.log("Username fix scheduled job added");

  const worker = createUsernameFixWorker();
  console.log("Username fix worker started");

  worker.on("failed", (job, err) => {
    console.error(`Username fix job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start username fix worker:", err);
  process.exit(1);
});
