/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { createEmailWorker } from "./email.worker.js";
import { sendEmailDirect, type SendEmailParams } from "../services/email.service.js";

async function main() {
  await connectDatabase();
  console.log("Email worker connected to MongoDB");

  const worker = createEmailWorker(async (params) => {
    await sendEmailDirect(params as SendEmailParams);
  });
  console.log("Email worker started");

  worker.on("failed", (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start email worker:", err);
  process.exit(1);
});
