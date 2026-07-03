/* eslint-disable no-console */
import { config } from "dotenv";
import { tmdbService } from "../src/services/tmdb.service.js";
import { tvdbService } from "../src/services/tvdb.service.js";

config();

const query = process.argv[2] || "rookie";

async function testTmdb(): Promise<void> {
  console.log(`\n[TMDB] Searching for "${query}"...`);
  try {
    const tvResults = await tmdbService.searchShows(query);
    console.log(`[TMDB] TV results: ${tvResults.length}`);
    if (tvResults.length > 0) {
      console.log(`[TMDB] First TV result: ${tvResults[0].name} (id=${tvResults[0].id})`);
    }

    const movieResults = await tmdbService.searchMovies(query);
    console.log(`[TMDB] Movie results: ${movieResults.length}`);
    if (movieResults.length > 0) {
      console.log(`[TMDB] First movie result: ${movieResults[0].title} (id=${movieResults[0].id})`);
    }
  } catch (err) {
    console.error("[TMDB] ERROR:", err);
  }
}

async function testTvdb(): Promise<void> {
  console.log(`\n[TVDB] Searching for "${query}"...`);
  try {
    const tvResults = await tvdbService.searchShows(query);
    console.log(`[TVDB] TV results: ${tvResults.length}`);
    if (tvResults.length > 0) {
      console.log(`[TVDB] First TV result: ${tvResults[0].name} (id=${tvResults[0].id})`);
    }

    const movieResults = await tvdbService.searchMovies(query);
    console.log(`[TVDB] Movie results: ${movieResults.length}`);
    if (movieResults.length > 0) {
      console.log(`[TVDB] First movie result: ${movieResults[0].name} (id=${movieResults[0].id})`);
    }
  } catch (err) {
    console.error("[TVDB] ERROR:", err);
  }
}

async function main(): Promise<void> {
  console.log("=== API Connection Test ===");
  console.log(`TMDB_API_KEY present: ${Boolean(process.env.TMDB_API_KEY)}`);
  console.log(`TVDB_API_KEY present: ${Boolean(process.env.TVDB_API_KEY)}`);

  await testTmdb();
  await testTvdb();
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
