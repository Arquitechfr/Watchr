import { connectDatabase } from "../src/lib/database.js";
import { Show } from "../src/models/show.model.js";
import { syncEpisodesForShow } from "../src/services/cacheShow.service.js";

async function syncAllEpisodes() {
  await connectDatabase();

  const shows = await Show.find({ type: "tv" });
  console.log(`Found ${shows.length} TV shows`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const show of shows) {
    const hasEpisodes = show.seasons.some((s) => s.episodes && s.episodes.length > 0);
    
    if (hasEpisodes) {
      console.log(`Skipping ${show.title} (tmdbId: ${show.tmdbId}) - already has episodes`);
      skipped++;
      continue;
    }

    try {
      console.log(`Syncing ${show.title} (tmdbId: ${show.tmdbId})...`);
      await syncEpisodesForShow(show, "en-US");
      console.log(`✓ Synced ${show.title}`);
      synced++;
    } catch (err) {
      console.error(`✗ Failed to sync ${show.title}:`, err);
      errors++;
    }
  }

  console.log(`\nDone: ${synced} synced, ${skipped} skipped, ${errors} errors`);
  process.exit(0);
}

syncAllEpisodes().catch((err) => {
  console.error(err);
  process.exit(1);
});
