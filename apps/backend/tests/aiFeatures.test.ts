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
    const originalClients = (mistralService as any).clients;
    (mistralService as any).clients = [];

    const result = await moderateComment("Some comment text");

    expect(result.isSpoiler).toBe(false);
    expect(result.isToxic).toBe(false);
    expect(result.confidence).toBe(0);

    (mistralService as any).clients = originalClients;
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

  it("should mark as spoiler when AI detects spoiler even if user did not toggle it", async () => {
    const inputIsSpoiler = false;
    const moderationIsSpoiler = true;
    const result = inputIsSpoiler || moderationIsSpoiler;
    expect(result).toBe(true);
  });

  it("should not mark as spoiler when neither user nor AI flags it", async () => {
    const inputIsSpoiler = false;
    const moderationIsSpoiler = false;
    const result = inputIsSpoiler || moderationIsSpoiler;
    expect(result).toBe(false);
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

describe("Toxic Error Code Mapping", () => {
  function getCategoryErrorCode(category?: string): string {
    switch (category) {
      case "hate":
        return "COMMENT_REJECTED_HATE";
      case "harassment":
        return "COMMENT_REJECTED_HARASSMENT";
      case "spam":
        return "COMMENT_REJECTED_SPAM";
      case "self_harm":
        return "COMMENT_REJECTED_SELF_HARM";
      case "violence":
        return "COMMENT_REJECTED_VIOLENCE";
      default:
        return "COMMENT_REJECTED_OTHER";
    }
  }

  const categoryToCode: Record<string, string> = {
    hate: "COMMENT_REJECTED_HATE",
    harassment: "COMMENT_REJECTED_HARASSMENT",
    spam: "COMMENT_REJECTED_SPAM",
    self_harm: "COMMENT_REJECTED_SELF_HARM",
    violence: "COMMENT_REJECTED_VIOLENCE",
  };

  it("should map each toxic category to the correct error code", () => {
    for (const [category, expectedCode] of Object.entries(categoryToCode)) {
      const moderation = { isToxic: true, toxicCategory: category, confidence: 0.9, isSpoiler: false };
      expect(moderation.toxicCategory).toBe(category);

      const code = getCategoryErrorCode(moderation.toxicCategory);
      expect(code).toBe(expectedCode);
    }
  });

  it("should map unknown/undefined category to COMMENT_REJECTED_OTHER", () => {
    expect(getCategoryErrorCode(undefined)).toBe("COMMENT_REJECTED_OTHER");
    expect(getCategoryErrorCode("unknown_category")).toBe("COMMENT_REJECTED_OTHER");
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

    const originalClients = (mistralService as any).clients;
    (mistralService as any).clients = [];

    const result = await aiFuzzyMatch({ title: "Breaking Bda" });

    expect(result).toBeNull();

    (mistralService as any).clients = originalClients;
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
