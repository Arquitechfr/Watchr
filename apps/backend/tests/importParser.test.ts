import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import {
  parseCsvRecords,
  detectCsvVariant,
  normalizeTvTimeStatus,
  extractImportFiles,
} from "../src/services/importParser.service.js";
import { setup, teardown } from "./setup.js";
import { clearDatabase } from "../src/lib/database.js";

function createTempCsv(content: string): string {
  const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "watchr-test-"));
  const csvPath = path.join(tempDir, "tracking-prod-records.csv");
  fs.writeFileSync(csvPath, content, "utf8");
  return csvPath;
}

function createZipWithCsv(filename: string, content: string): string {
  const zip = new AdmZip();
  zip.addFile(filename, Buffer.from(content, "utf8"));
  const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "watchr-test-"));
  const zipPath = path.join(tempDir, "export.zip");
  zip.writeZip(zipPath);
  return zipPath;
}

describe("Import parser", () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(clearDatabase);

  it("should parse tracking-prod-records.csv", () => {
    const csv = "title,status,rating\n" + "Breaking Bad,watching,10\n" + "The Office,completed,8\n";
    const file = createTempCsv(csv);
    const variant = detectCsvVariant(file);
    expect(variant).toBe("tracking");
    const records = parseCsvRecords(file);
    expect(records).toHaveLength(2);
    expect(records[0].title).toBe("Breaking Bad");
    expect(records[0].status).toBe("watching");
    expect(records[0].rating).toBe(10);
  });

  it("should parse tracking-prod-records-v2.csv", () => {
    const csv = "title,status,rating,season,episode\n" + "Game of Thrones,watching,9,1,1\n" + "Lost,completed,7,2,5\n";
    const file = createTempCsv(csv);
    const records = parseCsvRecords(file);
    expect(records).toHaveLength(2);
    expect(records[0].title).toBe("Game of Thrones");
    expect(records[0].season).toBe(1);
    expect(records[0].episode).toBe(1);
  });

  it("should not crash on malformed row and should report it", () => {
    const csv = "title,status,rating\n" + "Valid Show,watching,5\n" + ",completed,\n";
    const file = createTempCsv(csv);
    const records = parseCsvRecords(file);
    expect(records).toHaveLength(2);
    expect(records[1].title).toBe("");
  });

  it("should extract CSV files from zip", async () => {
    const csv = "title,status,rating\n" + "Show,watching,5\n";
    const zipPath = createZipWithCsv("tracking-prod-records.csv", csv);
    const files = await extractImportFiles(zipPath);
    expect(files.length).toBeGreaterThan(0);
    const records = parseCsvRecords(files[0]);
    expect(records[0].title).toBe("Show");
  });

  it("should normalize TV Time statuses", () => {
    expect(normalizeTvTimeStatus("Watching")).toBe("watching");
    expect(normalizeTvTimeStatus("completed")).toBe("completed");
    expect(normalizeTvTimeStatus("Plan to watch")).toBe("plan_to_watch");
    expect(normalizeTvTimeStatus("Dropped")).toBe("dropped");
    expect(normalizeTvTimeStatus("Watched")).toBe("completed");
    expect(normalizeTvTimeStatus("On Hold")).toBe("plan_to_watch");
  });
});
