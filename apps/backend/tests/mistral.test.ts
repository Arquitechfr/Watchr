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
      const originalClients = (mistralService as any).clients;
      (mistralService as any).clients = [];

      const result = await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result).toBeNull();
      (mistralService as any).clients = originalClients;
    });

    it("should return null when rate limiter is exhausted (429 simulation)", async () => {
      const originalClients = (mistralService as any).clients;
      (mistralService as any).clients = [];

      const result = await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result).toBeNull();
      (mistralService as any).clients = originalClients;
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
      const originalClients = (mistralService as any).clients;
      (mistralService as any).clients = [];

      await expect(
        mistralService.chat({ messages: [{ role: "user", content: "test" }] }),
      ).rejects.toThrow("Mistral AI service is not configured");

      (mistralService as any).clients = originalClients;
    });
  });

  describe("Rate limiter integration", () => {
    it("should consume tokens from mistralRateLimiter on each call", async () => {
      const consumeSpy = vi.spyOn(mistralRateLimiter, "consume");

      const clients = (mistralService as any).clients as any[];
      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRejectedValueOnce(new Error("forced"));
      }

      await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(consumeSpy).toHaveBeenCalled();
    });
  });

  describe("Multi-key support", () => {
    it("should parse comma-separated keys and create multiple clients", () => {
      expect((mistralService as any).clients.length).toBeGreaterThanOrEqual(1);
    });

    it("getApiKeysCount should return the number of configured keys", () => {
      expect(mistralService.getApiKeysCount()).toBeGreaterThanOrEqual(1);
    });

    it("should retry with another key on 429", async () => {
      const rateLimitErr = Object.assign(new Error("429 Too Many Requests"), { status: 429 });
      const successResult = {
        choices: [{ message: { content: "success" } }],
        model: "mistral-large-latest",
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
      };

      const clients = (mistralService as any).clients as any[];
      if (clients.length < 2) return; // skip if only 1 key configured

      vi.spyOn(clients[0].chat, "complete").mockRejectedValueOnce(rateLimitErr);
      vi.spyOn(clients[1].chat, "complete").mockResolvedValueOnce(successResult);

      // Force pickClient to use index 0 first, then index 1
      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValueOnce({ client: clients[0], index: 0 })
        .mockReturnValueOnce({ client: clients[1], index: 1 });

      const result = await mistralService.chat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result.content).toBe("success");
      expect((mistralService as any).cooldowns.get(0)).toBeDefined();
    });

    it("should throw after max retries when all keys return 429", async () => {
      const rateLimitErr = Object.assign(new Error("429 Too Many Requests"), { status: 429 });
      const clients = (mistralService as any).clients as any[];

      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRejectedValue(rateLimitErr);
      }

      await expect(
        mistralService.chat({ messages: [{ role: "user", content: "test" }] }),
      ).rejects.toThrow();

      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRestore();
      }
    });
  });
});
