/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createNotificationWorker, scheduleEpisodeNotifications } from "./notification.worker.js";

async function main() {
  await connectDatabase();
  console.log("Notification worker connected to MongoDB");

  await scheduleEpisodeNotifications();
  const worker = createNotificationWorker();
  console.log("Notification worker started");

  worker.on("failed", (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start notification worker:", err);
  process.exit(1);
});
