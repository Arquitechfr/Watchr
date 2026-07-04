/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/lib/database.js";
import { processEpisodeNotifications } from "../src/workers/notification.worker.js";

async function main() {
  await connectDatabase();
  console.log("Running manual notification check...");
  await processEpisodeNotifications();
  console.log("Done.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to run notifications:", err);
  process.exit(1);
});
