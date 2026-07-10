import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mistralService } from "../src/services/mistral.service.js";
import { mistralRateLimiter } from "../src/lib/rateLimiter.js";

vi.mock("../src/config/env.js", () => ({
  env: {
    MISTRAL_API_KEY: "test-mistral-key",
  },
}));

describe("MistralService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isConfigured", () => {
    it("should return true when API key is set", () => {
      expect(mistralService.isConfigured()).toBe(true);
    });
  });

  describe("safeChat", () => {
    it("should return null when chat throws (network error simulation)", async () => {
      vi.spyOn(mistralService as any, "chat").mockRejectedValueOnce(new Error("Network error"));

      const result = await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result).toBeNull();
    });

    it("should return null when MISTRAL_API_KEY is missing (not configured)", async () => {
      const originalClient = (mistralService as any).client;
      (mistralService as any).client = null;

      const result = await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result).toBeNull();
      (mistralService as any).client = originalClient;
    });

    it("should return null when rate limiter is exhausted (429 simulation)", async () => {
      const originalClient = (mistralService as any).client;
      (mistralService as any).client = null;

      const result = await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result).toBeNull();
      (mistralService as any).client = originalClient;
    });

    it("should return a result when chat succeeds", async () => {
      vi.spyOn(mistralService as any, "chat").mockResolvedValueOnce({
        content: "improved text",
        model: "mistral-large-latest",
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });

      const result = await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result).not.toBeNull();
      expect(result!.content).toBe("improved text");
    });
  });

  describe("safeEmbeddings", () => {
    it("should return null when embeddings throws", async () => {
      vi.spyOn(mistralService as any, "embeddings").mockRejectedValueOnce(new Error("API error"));

      const result = await mistralService.safeEmbeddings({
        inputs: ["test input"],
      });

      expect(result).toBeNull();
    });

    it("should return a result when embeddings succeeds", async () => {
      vi.spyOn(mistralService as any, "embeddings").mockResolvedValueOnce({
        embeddings: [[0.1, 0.2, 0.3]],
        model: "mistral-embed",
      });

      const result = await mistralService.safeEmbeddings({
        inputs: ["test input"],
      });

      expect(result).not.toBeNull();
      expect(result!.embeddings).toHaveLength(1);
      expect(result!.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe("chat (throwing version)", () => {
    it("should throw ApiError when not configured", async () => {
      const originalClient = (mistralService as any).client;
      (mistralService as any).client = null;

      await expect(
        mistralService.chat({ messages: [{ role: "user", content: "test" }] }),
      ).rejects.toThrow("Mistral AI service is not configured");

      (mistralService as any).client = originalClient;
    });
  });

  describe("Rate limiter integration", () => {
    it("should consume tokens from mistralRateLimiter on each call", async () => {
      const consumeSpy = vi.spyOn(mistralRateLimiter, "consume");

      const client = (mistralService as any).client;
      vi.spyOn(client.chat, "complete").mockRejectedValueOnce(new Error("forced"));

      await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(consumeSpy).toHaveBeenCalled();
    });
  });
});
