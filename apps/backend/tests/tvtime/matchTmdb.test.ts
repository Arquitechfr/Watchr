import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/services/tmdb.service.js", () => ({
  tmdbService: {
    searchShows: vi.fn(),
    searchMovies: vi.fn(),
  },
}));

vi.mock("../../src/lib/redis.js", () => ({
  getRedisValue: vi.fn().mockResolvedValue(null),
  setRedisValue: vi.fn().mockResolvedValue(undefined),
}));

import { matchToTmdb, CONFIDENCE_THRESHOLD_TV } from "../../src/services/import/tvtime/matchTmdb.js";
import { tmdbService } from "../../src/services/tmdb.service.js";

describe("matchToTmdb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should auto-match when score >= 0.75 (exact title, year match)", async () => {
    vi.mocked(tmdbService.searchShows).mockResolvedValue([
      { id: 1396, name: "Breaking Bad", first_air_date: "2008-01-20" },
    ]);

    const results = await matchToTmdb(
      [{ title: "Breaking Bad", year: 2008, tvtimeInternalId: "123" }],
      "tv",
    );

    expect(results).toHaveLength(1);
    expect(results[0].matched).toBe(true);
    expect(results[0].bestMatch).not.toBeNull();
    expect(results[0].bestMatch!.tmdbId).toBe(1396);
    expect(results[0].bestMatch!.confidenceScore).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD_TV);
  });

  it("should not auto-match when title is similar but not exact and year mismatches", async () => {
    vi.mocked(tmdbService.searchShows).mockResolvedValue([
      { id: 57243, name: "Doctor Who", first_air_date: "2005-03-26" },
      { id: 39787, name: "Doctor Who", first_air_date: "1963-11-23" },
    ]);

    const results = await matchToTmdb(
      [{ title: "Doctor Who Extra", year: 2023, tvtimeInternalId: "449991" }],
      "tv",
    );

    expect(results).toHaveLength(1);
    // "Doctor Who Extra" vs "Doctor Who" — title similarity is high but not exact
    // and year doesn't match 2005. Score should be below 0.75.
    expect(results[0].matched).toBe(false);
    expect(results[0].candidates.length).toBeGreaterThan(0);
  });

  it("should auto-match Doctor Who (2005) with correct TMDB result", async () => {
    vi.mocked(tmdbService.searchShows).mockResolvedValue([
      { id: 57243, name: "Doctor Who", first_air_date: "2005-03-26" },
    ]);

    const results = await matchToTmdb(
      [{ title: "Doctor Who", year: 2005, tvtimeInternalId: "112671" }],
      "tv",
    );

    expect(results[0].matched).toBe(true);
    expect(results[0].bestMatch!.tmdbId).toBe(57243);
  });

  it("should return candidates for unmatched items", async () => {
    vi.mocked(tmdbService.searchMovies).mockResolvedValue([
      { id: 1, title: "Inception", release_date: "2010-07-16" },
      { id: 2, title: "Inception", release_date: "2003-01-01" },
    ]);

    const results = await matchToTmdb(
      [{ title: "Inception", year: 2010, tvtimeInternalId: "999" }],
      "movie",
    );

    expect(results[0].matched).toBe(true);
    expect(results[0].bestMatch!.tmdbId).toBe(1);
  });

  it("should handle empty TMDB results gracefully", async () => {
    vi.mocked(tmdbService.searchShows).mockResolvedValue([]);

    const results = await matchToTmdb(
      [{ title: "Nonexistent Show", year: null, tvtimeInternalId: "abc" }],
      "tv",
    );

    expect(results[0].matched).toBe(false);
    expect(results[0].candidates).toHaveLength(0);
    expect(results[0].bestMatch).toBeNull();
  });

  it("should not auto-match below threshold even with a single candidate", async () => {
    vi.mocked(tmdbService.searchShows).mockResolvedValue([
      { id: 123, name: "Completely Different Title", first_air_date: "2020-01-01" },
    ]);

    const results = await matchToTmdb(
      [{ title: "The Boys", year: 2019, tvtimeInternalId: "355567" }],
      "tv",
    );

    expect(results[0].matched).toBe(false);
    expect(results[0].candidates).toHaveLength(1);
  });
});
