import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { Types } from "mongoose";

vi.mock("../../src/services/tmdb.service.js", () => ({
  tmdbService: {
    getTvDetails: vi.fn(),
    getTvSeason: vi.fn(),
  },
}));

import { setup, teardown } from "../setup.js";
import { clearDatabase } from "../../src/lib/database.js";
import { Show } from "../../src/models/show.model.js";
import { WatchEntry } from "../../src/models/watchEntry.model.js";
import { resolveWatchedEpisodes } from "../../src/services/import/tvtime/resolveWatchedEpisodes.js";
import type { TvTimeEpisodeEntry } from "../../src/services/import/tvtime/types.js";

describe("resolveWatchedEpisodes", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(async () => {
    await clearDatabase();
  });

  async function createShow(tmdbId: number, seasons: Array<{ seasonNumber: number; episodes: Array<{ episodeNumber: number }> }>) {
    return Show.create({
      tmdbId,
      type: "tv",
      title: "Test Show",
      seasons: seasons.map((s) => ({
        seasonNumber: s.seasonNumber,
        episodes: s.episodes.map((e) => ({ episodeNumber: e.episodeNumber })),
      })),
    });
  }

  it("should bulk-fill all episodes up to the last watched", async () => {
    const show = await createShow(123, [
      {
        seasonNumber: 1,
        episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }, { episodeNumber: 3 }],
      },
    ]);

    const userId = new Types.ObjectId().toString();
    const episodeEntries: TvTimeEpisodeEntry[] = [
      {
        sId: "s1",
        seriesNameRaw: "Test Show",
        title: "Test Show",
        year: null,
        seasonNumber: 1,
        episodeNumber: 2,
        epId: "100",
        isSpecial: false,
        isRewatch: false,
        createdAt: new Date("2024-06-01T10:00:00Z"),
      },
    ];

    await resolveWatchedEpisodes(userId, [
      { tmdbId: 123, showId: show._id as Types.ObjectId, sId: "s1" },
    ], episodeEntries);

    const entry = await WatchEntry.findOne({ userId: new Types.ObjectId(userId), showId: show._id });
    expect(entry).not.toBeNull();
    expect(entry!.watchedEpisodes).toHaveLength(2);

    // Episode 1 should be bulk-filled
    const ep1 = entry!.watchedEpisodes.find((e) => e.season === 1 && e.episode === 1);
    expect(ep1).toBeDefined();
    expect(ep1!.importedBulk).toBe(true);
    expect(ep1!.watchedAt).toBeUndefined();

    // Episode 2 should be the real last watched
    const ep2 = entry!.watchedEpisodes.find((e) => e.season === 1 && e.episode === 2);
    expect(ep2).toBeDefined();
    expect(ep2!.importedBulk).toBe(false);
    expect(ep2!.watchedAt).toEqual(new Date("2024-06-01T10:00:00Z"));

    // Episode 3 should NOT be watched
    const ep3 = entry!.watchedEpisodes.find((e) => e.season === 1 && e.episode === 3);
    expect(ep3).toBeUndefined();
  });

  it("should exclude specials (season 0) from bulk-fill", async () => {
    const show = await createShow(456, [
      {
        seasonNumber: 0,
        episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }],
      },
      {
        seasonNumber: 1,
        episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }],
      },
    ]);

    const userId = new Types.ObjectId().toString();
    const episodeEntries: TvTimeEpisodeEntry[] = [
      {
        sId: "s2",
        seriesNameRaw: "Test Show 2",
        title: "Test Show 2",
        year: null,
        seasonNumber: 1,
        episodeNumber: 1,
        epId: "200",
        isSpecial: false,
        isRewatch: false,
        createdAt: new Date("2024-07-01T10:00:00Z"),
      },
    ];

    await resolveWatchedEpisodes(userId, [
      { tmdbId: 456, showId: show._id as Types.ObjectId, sId: "s2" },
    ], episodeEntries);

    const entry = await WatchEntry.findOne({ userId: new Types.ObjectId(userId), showId: show._id });
    expect(entry!.watchedEpisodes).toHaveLength(1);
    expect(entry!.watchedEpisodes[0].season).toBe(1);
    expect(entry!.watchedEpisodes[0].episode).toBe(1);
    expect(entry!.watchedEpisodes[0].importedBulk).toBe(false);
  });

  it("should include explicit specials from the export", async () => {
    const show = await createShow(789, [
      {
        seasonNumber: 0,
        episodes: [{ episodeNumber: 1 }],
      },
      {
        seasonNumber: 1,
        episodes: [{ episodeNumber: 1 }, { episodeNumber: 2 }],
      },
    ]);

    const userId = new Types.ObjectId().toString();
    const episodeEntries: TvTimeEpisodeEntry[] = [
      {
        sId: "s3",
        seriesNameRaw: "Test Show 3",
        title: "Test Show 3",
        year: null,
        seasonNumber: 1,
        episodeNumber: 2,
        epId: "300",
        isSpecial: false,
        isRewatch: false,
        createdAt: new Date("2024-08-01T10:00:00Z"),
      },
      {
        sId: "s3",
        seriesNameRaw: "Test Show 3",
        title: "Test Show 3",
        year: null,
        seasonNumber: 0,
        episodeNumber: 1,
        epId: "301",
        isSpecial: true,
        isRewatch: false,
        createdAt: new Date("2024-08-02T10:00:00Z"),
      },
    ];

    await resolveWatchedEpisodes(userId, [
      { tmdbId: 789, showId: show._id as Types.ObjectId, sId: "s3" },
    ], episodeEntries);

    const entry = await WatchEntry.findOne({ userId: new Types.ObjectId(userId), showId: show._id });
    // Should have: S0E1 (explicit special), S1E1 (bulk), S1E2 (real)
    expect(entry!.watchedEpisodes).toHaveLength(3);

    const special = entry!.watchedEpisodes.find((e) => e.season === 0 && e.episode === 1);
    expect(special).toBeDefined();
    expect(special!.importedBulk).toBe(false);
    expect(special!.watchedAt).toEqual(new Date("2024-08-02T10:00:00Z"));
  });

  it("should handle series with no watched episodes (plan_to_watch)", async () => {
    const show = await createShow(999, [
      { seasonNumber: 1, episodes: [{ episodeNumber: 1 }] },
    ]);

    const userId = new Types.ObjectId().toString();
    await resolveWatchedEpisodes(userId, [
      { tmdbId: 999, showId: show._id as Types.ObjectId, sId: "s4" },
    ], []);

    const entry = await WatchEntry.findOne({ userId: new Types.ObjectId(userId), showId: show._id });
    expect(entry).not.toBeNull();
    expect(entry!.status).toBe("plan_to_watch");
    expect(entry!.watchedEpisodes).toHaveLength(0);
  });
});
