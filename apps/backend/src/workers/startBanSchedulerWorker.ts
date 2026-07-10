import "dotenv/config";
import { connectDatabase } from "../lib/database.js";
import { createBanSchedulerWorker } from "./banScheduler.worker.js";

async function main() {
  await connectDatabase();
  console.log("Ban scheduler worker connected to MongoDB");

  const worker = createBanSchedulerWorker();
  console.log("Ban scheduler worker started");

  worker.on("failed", (job, err) => {
    console.error(`Ban scheduler job ${job?.id} failed:`, err);
  });

  process.on("SIGTERM", async () => {
    console.log("Ban scheduler worker shutting down...");
    await worker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start ban scheduler worker:", err);
  process.exit(1);
});
