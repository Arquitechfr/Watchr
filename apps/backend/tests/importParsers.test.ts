import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { TraktParser } from "../src/services/import/traktParser.js";
import { ImdbParser } from "../src/services/import/imdbParser.js";
import { LetterboxdParser } from "../src/services/import/letterboxdParser.js";
import { detectSource, getParser, parseFile } from "../src/services/import/parserRegistry.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";

function createTempFile(content: string, ext: string): string {
  const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "watchr-test-"));
  const filePath = path.join(tempDir, `test.${ext}`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

describe("Trakt parser", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  const traktJson = JSON.stringify({
    watched: [
      {
        watched_at: "2024-01-15T10:30:00Z",
        type: "episode",
        show: { title: "Breaking Bad", year: 2008, ids: { trakt: 1, tmdb: 1396, imdb: "tt0903747" } },
        episode: { season: 1, number: 1, title: "Pilot", ids: { trakt: 100, tmdb: 62085 } },
      },
      {
        watched_at: "2024-02-20T20:00:00Z",
        type: "movie",
        movie: { title: "Inception", year: 2010, ids: { trakt: 2, tmdb: 27205, imdb: "tt1375666" } },
      },
    ],
    ratings: [
      {
        rated_at: "2024-01-16T12:00:00Z",
        rating: 9,
        type: "show",
        show: { title: "Breaking Bad", year: 2008, ids: { trakt: 1, tmdb: 1396 } },
      },
    ],
    watchlist: [
      {
        listed_at: "2024-03-01T00:00:00Z",
        type: "show",
        show: { title: "The Bear", year: 2022, ids: { trakt: 3, tmdb: 95627 } },
      },
    ],
  });

  it("should detect Trakt JSON format", () => {
    const file = createTempFile(traktJson, "json");
    const parser = new TraktParser();
    expect(parser.detect(file)).toBe(true);
  });

  it("should parse Trakt history, ratings, and watchlist", () => {
    const file = createTempFile(traktJson, "json");
    const parser = new TraktParser();
    const records = parser.parse(file);
    expect(records).toHaveLength(4);
    expect(records[0].title).toBe("Breaking Bad");
    expect(records[0].season).toBe(1);
    expect(records[0].episode).toBe(1);
    expect(records[0].type).toBe("tv");
    expect(records[0].status).toBe("watching");
    expect(records[1].title).toBe("Inception");
    expect(records[1].type).toBe("movie");
    expect(records[1].status).toBe("completed");
    expect(records[2].title).toBe("Breaking Bad");
    expect(records[2].rating).toBe(9);
    expect(records[3].title).toBe("The Bear");
    expect(records[3].status).toBe("plan_to_watch");
  });

  it("should parse Trakt array-only format (history only)", () => {
    const arrayJson = JSON.stringify([
      {
        watched_at: "2024-01-15T10:30:00Z",
        type: "episode",
        show: { title: "Lost", year: 2004, ids: { trakt: 5, tmdb: 4607 } },
        episode: { season: 2, number: 5, title: "And Found", ids: { trakt: 200 } },
      },
    ]);
    const file = createTempFile(arrayJson, "json");
    const parser = new TraktParser();
    const records = parser.parse(file);
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Lost");
    expect(records[0].season).toBe(2);
  });
});

describe("IMDb parser", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  const imdbCsv =
    "Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors\n" +
    "tt0903747,10,2024-01-15,Breaking Bad,https://www.imdb.com/title/tt0903747/,TV Series,9.5,45,2008,Crime,1500000,2008-01-20,\n" +
    "tt1375666,9,2024-02-20,Inception,https://www.imdb.com/title/tt1375666/,Movie,8.8,148,2010,Sci-Fi,2000000,2010-07-16,Christopher Nolan\n";

  it("should detect IMDb CSV format", () => {
    const file = createTempFile(imdbCsv, "csv");
    const parser = new ImdbParser();
    expect(parser.detect(file)).toBe(true);
  });

  it("should parse IMDb CSV records", () => {
    const file = createTempFile(imdbCsv, "csv");
    const parser = new ImdbParser();
    const records = parser.parse(file);
    expect(records).toHaveLength(2);
    expect(records[0].title).toBe("Breaking Bad");
    expect(records[0].rating).toBe(10);
    expect(records[0].type).toBe("tv");
    expect(records[0].imdbId).toBe("tt0903747");
    expect(records[1].title).toBe("Inception");
    expect(records[1].rating).toBe(9);
    expect(records[1].type).toBe("movie");
  });
});

describe("Letterboxd parser", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  const letterboxdCsv =
    "Date,Name,Year,Letterboxd URI,Rating,Watched Date,Tags,Comments\n" +
    "2024-01-15,Inception,2010,https://letterboxd.com/film/inception/,4.5,2024-01-15,,Amazing\n" +
    "2024-02-20,The Dark Knight,2008,https://letterboxd.com/film/the-dark-knight/,5,2024-02-20,,\n";

  it("should detect Letterboxd CSV format", () => {
    const file = createTempFile(letterboxdCsv, "csv");
    const parser = new LetterboxdParser();
    expect(parser.detect(file)).toBe(true);
  });

  it("should parse Letterboxd CSV records with rating conversion", () => {
    const file = createTempFile(letterboxdCsv, "csv");
    const parser = new LetterboxdParser();
    const records = parser.parse(file);
    expect(records).toHaveLength(2);
    expect(records[0].title).toBe("Inception");
    expect(records[0].rating).toBe(9);
    expect(records[0].type).toBe("movie");
    expect(records[0].status).toBe("completed");
    expect(records[1].title).toBe("The Dark Knight");
    expect(records[1].rating).toBe(10);
  });
});

describe("Parser registry - format detection", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  it("should detect Trakt source from JSON file", () => {
    const file = createTempFile(
      JSON.stringify({ watched: [{ watched_at: "2024-01-01T00:00:00Z", show: { title: "Test" } }] }),
      "json",
    );
    expect(detectSource(file)).toBe("trakt");
  });

  it("should detect IMDb source from CSV file", () => {
    const file = createTempFile(
      "Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors\ntt001,8,2024-01-01,Test,https://imdb.com,Movie,8,120,2024,Drama,100,2024-01-01,\n",
      "csv",
    );
    expect(detectSource(file)).toBe("imdb");
  });

  it("should detect Letterboxd source from CSV file", () => {
    const file = createTempFile(
      "Date,Name,Year,Letterboxd URI,Rating,Watched Date,Tags,Comments\n2024-01-01,Test,2024,https://letterboxd.com/film/test/,4,2024-01-01,,\n",
      "csv",
    );
    expect(detectSource(file)).toBe("letterboxd");
  });

  it("should detect TV Time source from CSV file", () => {
    const file = createTempFile("title,status,rating\nBreaking Bad,watching,10\n", "csv");
    expect(detectSource(file)).toBe("tvtime");
  });

  it("should return unknown for unrecognized format", () => {
    const file = createTempFile("random,data\nfoo,bar\n", "csv");
    expect(detectSource(file)).toBe("unknown");
  });

  it("should return correct parser by source", () => {
    expect(getParser("trakt")?.source).toBe("trakt");
    expect(getParser("imdb")?.source).toBe("imdb");
    expect(getParser("letterboxd")?.source).toBe("letterboxd");
    expect(getParser("tvtime")?.source).toBe("tvtime");
    expect(getParser("unknown")).toBeNull();
  });

  it("should parse file with explicit source", () => {
    const traktJson = JSON.stringify([
      { watched_at: "2024-01-01T00:00:00Z", show: { title: "Test Show", ids: { tmdb: 123 } } },
    ]);
    const file = createTempFile(traktJson, "json");
    const records = parseFile(file, "trakt");
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Test Show");
  });
});
