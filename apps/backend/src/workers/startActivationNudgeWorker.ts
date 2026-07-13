import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createActivationNudgeWorker, scheduleActivationNudge } from "./activationNudge.worker.js";

async function main() {
  await connectDatabase();
  console.log("Activation nudge worker connected to MongoDB");

  await scheduleActivationNudge();
  const worker = createActivationNudgeWorker();
  console.log("Activation nudge worker started");

  worker.on("failed", (job, err) => {
    console.error(`Activation nudge job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start activation nudge worker:", err);
  process.exit(1);
});
