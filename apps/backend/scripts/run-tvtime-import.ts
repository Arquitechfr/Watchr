import * as path from "path";
import { fileURLToPath } from "url";
import { connectDatabase } from "../src/lib/database.js";
import { ImportJob } from "../src/models/importJob.model.js";
import { WatchEntry } from "../src/models/watchEntry.model.js";
import { PendingImportReview } from "../src/models/pendingImportReview.model.js";
import { processTvTimeImport } from "../src/services/import/tvtime/tvtimeImport.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_ID = "6a471d12960935c484bc4f9c";
const CSV_PATH = path.join(__dirname, "..", "assets", "gdpr-data.zip");

async function runTvTimeImport() {
  console.log("=== TV Time GDPR Import Script ===");
  console.log(`User ID: ${USER_ID}`);
  console.log(`CSV file: ${CSV_PATH}`);
  console.log("");

  await connectDatabase();

  // Clean up previous import data for this user
  console.log("Cleaning up previous import data...");
  await WatchEntry.deleteMany({ userId: USER_ID });
  await PendingImportReview.deleteMany({ userId: USER_ID });
  await ImportJob.deleteMany({ userId: USER_ID, source: "tvtime" });
  console.log("Cleanup done.\n");

  // Create an ImportJob record
  const job = await ImportJob.create({
    userId: USER_ID,
    status: "pending",
    source: "tvtime",
    sourceFile: CSV_PATH,
  });

  console.log(`Created ImportJob: ${job._id}`);
  console.log("Starting import...\n");

  try {
    const result = await processTvTimeImport(USER_ID, job._id.toString(), CSV_PATH);

    console.log("\n=== Import Results ===");
    console.log(`Total items:    ${result.total}`);
    console.log(`Matched:        ${result.matched}`);
    console.log(`Pending review: ${result.pendingReview}`);
    console.log(`Skipped rows:   ${result.skipped}`);
    if (result.errors.length > 0) {
      console.log(`Errors:         ${result.errors.length}`);
      for (const err of result.errors) {
        console.log(`  Line ${err.line}: ${err.reason}`);
      }
    }
    console.log("");
    console.log("Import completed successfully!");
  } catch (err) {
    console.error("\nImport failed:", err);
    process.exit(1);
  }

  process.exit(0);
}

runTvTimeImport().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
