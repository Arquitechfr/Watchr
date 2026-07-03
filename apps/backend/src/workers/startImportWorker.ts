/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createImportWorker } from "./import.worker.js";

async function main() {
  await connectDatabase();
  console.log("Import worker connected to MongoDB");

  const worker = createImportWorker();
  console.log("Import worker started");

  worker.on("failed", (job, err) => {
    console.error(`Import job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start import worker:", err);
  process.exit(1);
});
