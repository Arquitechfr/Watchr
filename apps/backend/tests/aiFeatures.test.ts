import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mistralService } from "../src/services/mistral.service.js";
import { moderateComment } from "../src/services/aiModeration.service.js";
import { aiFuzzyMatch } from "../src/services/aiImport.service.js";
import { MobileConfig } from "../src/models/MobileConfig.js";

vi.mock("../src/config/env.js", () => ({
  env: {
    MISTRAL_API_KEY: "test-mistral-key",
  },
}));

describe("AI Moderation Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return neutral result when Mistral is not configured", async () => {
    const originalClient = (mistralService as any).client;
    (mistralService as any).client = null;

    const result = await moderateComment("Some comment text");

    expect(result.isSpoiler).toBe(false);
    expect(result.isToxic).toBe(false);
    expect(result.confidence).toBe(0);

    (mistralService as any).client = originalClient;
  });

  it("should return neutral result when feature is disabled", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve(null),
    } as any);

    const result = await moderateComment("Some comment text");

    expect(result.isSpoiler).toBe(false);
    expect(result.isToxic).toBe(false);
  });

  it("should detect spoilers when AI returns spoiler=true", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve({ value: "true" }),
    } as any);

    vi.spyOn(mistralService, "safeChat").mockResolvedValueOnce({
      content: JSON.stringify({
        is_spoiler: true,
        is_toxic: false,
        toxic_category: null,
        confidence: 0.95,
      }),
      model: "mistral-large-latest",
      usage: {},
    });

    const result = await moderateComment("Walter White dies at the end", "Breaking Bad");

    expect(result.isSpoiler).toBe(true);
    expect(result.isToxic).toBe(false);
    expect(result.confidence).toBe(0.95);
  });

  it("should detect toxic content when AI returns toxic=true", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve({ value: "true" }),
    } as any);

    vi.spyOn(mistralService, "safeChat").mockResolvedValueOnce({
      content: JSON.stringify({
        is_spoiler: false,
        is_toxic: true,
        toxic_category: "harassment",
        confidence: 0.9,
      }),
      model: "mistral-large-latest",
      usage: {},
    });

    const result = await moderateComment("You are stupid");

    expect(result.isToxic).toBe(true);
    expect(result.toxicCategory).toBe("harassment");
  });

  it("should return neutral when AI returns null (unavailable)", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve({ value: "true" }),
    } as any);

    vi.spyOn(mistralService, "safeChat").mockResolvedValueOnce(null);

    const result = await moderateComment("Some text");

    expect(result.isSpoiler).toBe(false);
    expect(result.isToxic).toBe(false);
  });

  it("should return neutral when AI returns unparseable JSON", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve({ value: "true" }),
    } as any);

    vi.spyOn(mistralService, "safeChat").mockResolvedValueOnce({
      content: "not json at all",
      model: "mistral-large-latest",
      usage: {},
    });

    const result = await moderateComment("Some text");

    expect(result.isSpoiler).toBe(false);
    expect(result.isToxic).toBe(false);
  });
});

describe("AI Import Fuzzy Match", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return null when Mistral is not configured", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve({ value: "true" }),
    } as any);

    const originalClient = (mistralService as any).client;
    (mistralService as any).client = null;

    const result = await aiFuzzyMatch({ title: "Breaking Bda" });

    expect(result).toBeNull();

    (mistralService as any).client = originalClient;
  });

  it("should return null when feature is disabled", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve(null),
    } as any);

    const result = await aiFuzzyMatch({ title: "Breaking Bda" });

    expect(result).toBeNull();
  });

  it("should return null when AI confidence is below threshold", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve({ value: "true" }),
    } as any);

    vi.spyOn(mistralService, "safeChat").mockResolvedValueOnce({
      content: JSON.stringify({
        suggested_title: "Unknown Show",
        suggested_year: null,
        suggested_type: "tv",
        confidence: 0.5,
      }),
      model: "mistral-large-latest",
      usage: {},
    });

    const result = await aiFuzzyMatch({ title: "Some Unknown Show" });

    expect(result).toBeNull();
  });

  it("should return null when AI is unavailable (safeChat returns null)", async () => {
    vi.spyOn(MobileConfig, "findOne").mockReturnValue({
      lean: () => Promise.resolve({ value: "true" }),
    } as any);

    vi.spyOn(mistralService, "safeChat").mockResolvedValueOnce(null);

    const result = await aiFuzzyMatch({ title: "Breaking Bda" });

    expect(result).toBeNull();
  });

  it("should return null when record has no title", async () => {
    const result = await aiFuzzyMatch({ title: undefined as any });
    expect(result).toBeNull();
  });
});
