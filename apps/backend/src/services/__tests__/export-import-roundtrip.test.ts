import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Types } from "mongoose";
import { Show } from "../../models/show.model.js";
import { WatchEntry } from "../../models/watchEntry.model.js";
import { Rating } from "../../models/rating.model.js";
import { exportToJson, exportToCsv, exportToTraktJson, exportToImdbCsv, exportToLetterboxdCsv } from "../export.service.js";
import { parseGoMap } from "../import/tvtime/parseTvTimeExport.js";

const TEST_USER_ID = new Types.ObjectId().toString();

const TEST_SHOWS = [
  {
    tmdbId: 1,
    type: "tv" as const,
    title: "Test TV Show",
    imdbId: "tt1234567",
    firstAirDate: new Date("2020-01-01"),
    runtime: 45,
    genres: [{ id: 18, name: "Drama" }],
    crew: [{ id: 1, name: "Test Director", job: "Director" }],
  },
  {
    tmdbId: 2,
    type: "movie" as const,
    title: "Test Movie",
    imdbId: "tt7654321",
    firstAirDate: new Date("2021-06-15"),
    runtime: 120,
    genres: [{ id: 28, name: "Action" }],
    crew: [{ id: 2, name: "Movie Director", job: "Director" }],
  },
];

const TEST_WATCH_ENTRIES = [
  {
    userId: new Types.ObjectId(TEST_USER_ID),
    showId: null as Types.ObjectId | null,
    status: "watching",
    watchedEpisodes: [
      { season: 1, episode: 1, watchedAt: new Date("2023-01-01") },
      { season: 1, episode: 2, watchedAt: new Date("2023-01-02") },
    ],
    currentSeason: 1,
    currentEpisode: 2,
  },
  {
    userId: new Types.ObjectId(TEST_USER_ID),
    showId: null as Types.ObjectId | null,
    status: "completed",
    watchedEpisodes: [],
  },
];

const TEST_RATINGS = [
  {
    userId: new Types.ObjectId(TEST_USER_ID),
    showId: null as Types.ObjectId | null,
    value: 8,
  },
  {
    userId: new Types.ObjectId(TEST_USER_ID),
    showId: null as Types.ObjectId | null,
    value: 7,
  },
];

async function seedTestData() {
  await Show.deleteMany({});
  await WatchEntry.deleteMany({ userId: TEST_USER_ID });
  await Rating.deleteMany({ userId: TEST_USER_ID });

  const shows = await Show.insertMany(TEST_SHOWS);

  TEST_WATCH_ENTRIES[0].showId = shows[0]._id;
  TEST_WATCH_ENTRIES[1].showId = shows[1]._id;
  await WatchEntry.insertMany(TEST_WATCH_ENTRIES);

  TEST_RATINGS[0].showId = shows[0]._id;
  TEST_RATINGS[1].showId = shows[1]._id;
  await Rating.insertMany(TEST_RATINGS);

  return shows;
}

describe("Export → Import round-trip", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await Show.deleteMany({});
    await WatchEntry.deleteMany({ userId: TEST_USER_ID });
    await Rating.deleteMany({ userId: TEST_USER_ID });
  });

  describe("JSON export", () => {
    it("should export all entries with correct data", async () => {
      const json = await exportToJson(TEST_USER_ID);
      const data = JSON.parse(json);

      expect(data.exportedAt).toBeDefined();
      expect(data.entries).toHaveLength(2);

      const tvEntry = data.entries.find((e: { type: string }) => e.type === "tv");
      expect(tvEntry.title).toBe("Test TV Show");
      expect(tvEntry.status).toBe("watching");
      expect(tvEntry.rating).toBe(8);
      expect(tvEntry.watchedEpisodes).toHaveLength(2);
      expect(tvEntry.watchedEpisodes[0].season).toBe(1);
      expect(tvEntry.watchedEpisodes[0].episode).toBe(1);
    });
  });

  describe("CSV export", () => {
    it("should export CSV with correct columns", async () => {
      const csv = await exportToCsv(TEST_USER_ID);
      const lines = csv.split("\n");
      expect(lines[0]).toContain("title");
      expect(lines[0]).toContain("type");
      expect(lines[0]).toContain("tmdb_id");
      expect(lines[0]).toContain("status");
      expect(lines[0]).toContain("rating");
      expect(lines.length).toBe(3); // header + 2 entries
    });
  });

  describe("Trakt JSON export", () => {
    it("should include imdb ID in ids", async () => {
      const json = await exportToTraktJson(TEST_USER_ID);
      const data = JSON.parse(json);

      expect(data.watched).toBeDefined();
      expect(data.ratings).toBeDefined();
      expect(data.watchlist).toBeDefined();

      // Check that imdb ID is included
      const hasImdb = JSON.stringify(data).includes("tt1234567");
      expect(hasImdb).toBe(true);
    });

    it("should include watched_at timestamps", async () => {
      const json = await exportToTraktJson(TEST_USER_ID);
      const data = JSON.parse(json);

      const watchedEp = data.watched.find(
        (w: { type: string }) => w.type === "episode",
      );
      expect(watchedEp).toBeDefined();
      expect(watchedEp.watched_at).toBeTruthy();
    });

    it("should respect includeRatings: false", async () => {
      const json = await exportToTraktJson(TEST_USER_ID, { includeRatings: false });
      const data = JSON.parse(json);
      expect(data.ratings).toHaveLength(0);
    });

    it("should respect includeWatchlist: false", async () => {
      const json = await exportToTraktJson(TEST_USER_ID, { includeWatchlist: false });
      const data = JSON.parse(json);
      expect(data.watchlist).toHaveLength(0);
    });
  });

  describe("IMDb CSV export", () => {
    it("should include Const and URL from imdbId", async () => {
      const csv = await exportToImdbCsv(TEST_USER_ID);
      const lines = csv.split("\n");

      // Header should have Const and URL
      expect(lines[0]).toContain("Const");
      expect(lines[0]).toContain("URL");

      // At least one row should have imdbId in Const
      expect(csv).toContain("tt1234567");
      expect(csv).toContain("https://www.imdb.com/title/tt1234567/");
    });
  });

  describe("Letterboxd CSV export", () => {
    it("should only export movies", async () => {
      const csv = await exportToLetterboxdCsv(TEST_USER_ID);
      const lines = csv.split("\n");

      // header + 1 movie entry (TV show should be excluded)
      expect(lines.length).toBe(2);
      expect(csv).toContain("Test Movie");
      expect(csv).not.toContain("Test TV Show");
    });

    it("should convert rating to 0.5-5 scale", async () => {
      const csv = await exportToLetterboxdCsv(TEST_USER_ID);
      // Rating 7 → 3.5
      expect(csv).toContain("3.5");
    });
  });

  describe("parseGoMap robustness", () => {
    it("should parse standard Go map", () => {
      const result = parseGoMap("map[ep_id:6.733513e+06 ep_no:6 s_no:1]");
      expect(result).not.toBeNull();
      expect(result!.ep_id).toBe("6.733513e+06");
      expect(result!.ep_no).toBe("6");
      expect(result!.s_no).toBe("1");
    });

    it("should return null for invalid input", () => {
      expect(parseGoMap("")).toBeNull();
      expect(parseGoMap("not a map")).toBeNull();
      expect(parseGoMap("map[]")).not.toBeNull();
    });

    it("should handle values with spaces", () => {
      const result = parseGoMap("map[key1:value1 key2:value2 extra:data]");
      expect(result).not.toBeNull();
      expect(result!.key1).toBe("value1");
      expect(result!.key2).toBe("value2");
      expect(result!.extra).toBe("data");
    });
  });
});
