import { Types } from "mongoose";
import { connectDatabase, disconnectDatabase } from "../src/lib/database.js";
import { ImportJob } from "../src/models/importJob.model.js";
import { WatchEntry } from "../src/models/watchEntry.model.js";
import { PendingImportReview } from "../src/models/pendingImportReview.model.js";
import { Show } from "../src/models/show.model.js";

// Ensure Show model is registered for populate
void Show;

const USER_ID = "6a471d12960935c484bc4f9c";

async function analyzeImport() {
  await connectDatabase();

  const latestJob = await ImportJob.findOne({ userId: USER_ID, source: "tvtime" })
    .sort({ createdAt: -1 })
    .lean();

  if (!latestJob) {
    console.log("No TV Time import job found");
    process.exit(0);
  }

  console.log("=== Import Job Analysis ===");
  console.log(`Job ID: ${latestJob._id}`);
  console.log(`Status: ${latestJob.status}`);
  console.log(`Progress:`, JSON.stringify(latestJob.progress, null, 2));
  console.log(`Errors: ${latestJob.errorLog.length}`);
  if (latestJob.errorLog.length > 0) {
    for (const err of latestJob.errorLog) {
      console.log(`  Line ${err.line}: ${err.reason}`);
    }
  }

  const watchEntries = await WatchEntry.countDocuments({ userId: USER_ID });
  const watchEntriesBulk = await WatchEntry.countDocuments({
    userId: USER_ID,
    "watchedEpisodes.importedBulk": true,
  });
  const totalWatchedEps = await WatchEntry.aggregate([
    { $match: { userId: new Types.ObjectId(USER_ID) } },
    { $project: { count: { $size: { $ifNull: ["$watchedEpisodes", []] } } } },
    { $group: { _id: null, total: { $sum: "$count" } } },
  ]);

  console.log("\n=== Watch Entries ===");
  console.log(`Total WatchEntries: ${watchEntries}`);
  console.log(`Entries with bulk-filled episodes: ${watchEntriesBulk}`);
  console.log(`Total watched episodes: ${totalWatchedEps[0]?.total ?? 0}`);

  const pendingReviews = await PendingImportReview.countDocuments({
    importJobId: latestJob._id,
    status: "pending",
  });
  const resolvedReviews = await PendingImportReview.countDocuments({
    importJobId: latestJob._id,
    status: { $ne: "pending" },
  });

  console.log("\n=== Pending Reviews ===");
  console.log(`Pending: ${pendingReviews}`);
  console.log(`Resolved: ${resolvedReviews}`);

  // Sample pending reviews by media type
  const byMediaType = await PendingImportReview.aggregate([
    { $match: { importJobId: latestJob._id, status: "pending" } },
    { $group: { _id: "$sourceType", count: { $sum: 1 } } },
  ]);
  console.log(`By source type:`, byMediaType.map((m) => `${m._id}: ${m.count}`).join(", "));

  // Sample 5 pending reviews
  const samples = await PendingImportReview.find({
    importJobId: latestJob._id,
    status: "pending",
  })
    .limit(5)
    .select("sourceTitle sourceYear sourceType candidates.tmdbId candidates.title candidates.confidenceScore")
    .lean();

  console.log("\n=== Sample Pending Reviews ===");
  for (const s of samples) {
    console.log(`  - "${s.sourceTitle}" (${s.sourceType}, year: ${s.sourceYear}) — ${s.candidates.length} candidates`);
    for (const c of s.candidates.slice(0, 3)) {
      console.log(`      TMDB ${c.tmdbId}: "${c.title}" (score: ${c.confidenceScore?.toFixed(3)})`);
    }
  }

  // Sample 5 WatchEntries with episodes
  const weWithEps = await WatchEntry.find({
    userId: USER_ID,
    "watchedEpisodes.0": { $exists: true },
  })
    .populate("showId", "title type tmdbId")
    .limit(5)
    .lean();

  console.log("\n=== Sample Watch Entries (with episodes) ===");
  for (const we of weWithEps) {
    const show = we.showId as any;
    const bulkCount = we.watchedEpisodes.filter((e: any) => e.importedBulk).length;
    const realCount = we.watchedEpisodes.filter((e: any) => !e.importedBulk).length;
    console.log(
      `  - "${show?.title}" (${show?.type}) — status: ${we.status}, ${we.watchedEpisodes.length} eps (${bulkCount} bulk, ${realCount} real)`,
    );
  }

  // Check if Shows have seasons/episodes cached
  const showsWithEps = await Show.countDocuments({
    type: "tv",
    "seasons.0": { $exists: true },
  });
  const totalShows = await Show.countDocuments({ type: "tv" });
  console.log("\n=== Show Cache ===");
  console.log(`TV Shows total: ${totalShows}`);
  console.log(`TV Shows with seasons: ${showsWithEps}`);

  // Sample a TV Show to check seasons
  const sampleShow = await Show.findOne({ type: "tv" })
    .select("title tmdbId seasons.seasonNumber seasons.episodes.episodeNumber")
    .lean();
  if (sampleShow) {
    const totalEps = sampleShow.seasons?.reduce(
      (acc: number, s: any) => acc + (s.episodes?.length || 0),
      0,
    ) ?? 0;
    console.log(
      `Sample: "${sampleShow.title}" — ${sampleShow.seasons?.length ?? 0} seasons, ${totalEps} episodes`,
    );
  }

  await disconnectDatabase();
  process.exit(0);
}

analyzeImport().catch((err) => {
  console.error("Analysis failed:", err);
  process.exit(1);
});
