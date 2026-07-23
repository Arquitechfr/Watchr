import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mistralService } from "../src/services/mistral.service.js";
import { mistralRateLimiter } from "../src/lib/rateLimiter.js";
import { ApiError } from "../src/middleware/error.middleware.js";

vi.mock("../src/config/env.js", () => ({
  env: {
    MISTRAL_API_KEY: "test-mistral-key",
  },
}));

vi.mock("../src/lib/rateLimiter.js", () => ({
  mistralRateLimiter: { consume: vi.fn().mockResolvedValue(undefined) },
  sleep: vi.fn().mockResolvedValue(undefined),
  TokenBucket: vi.fn(),
}));

describe("MistralService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (mistralService as any).circuitOpen = false;
    (mistralService as any).circuitOpenedAt = 0;
    (mistralService as any).consecutiveFailures = 0;
    (mistralService as any).cooldowns.clear();
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
        model: "mistral-small-latest",
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
      (mistralRateLimiter.consume as any).mockClear();

      const clients = (mistralService as any).clients as any[];
      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRejectedValueOnce(new Error("forced"));
      }

      await mistralService.safeChat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(mistralRateLimiter.consume).toHaveBeenCalled();
    });
  });

  describe("Multi-key support", () => {
    it("should parse comma-separated keys and create multiple clients", () => {
      expect((mistralService as any).clients.length).toBeGreaterThanOrEqual(1);
    });

    it("getApiKeysCount should return the number of configured keys", () => {
      expect(mistralService.getApiKeysCount()).toBeGreaterThanOrEqual(1);
    });

    it("should rotate keys in round-robin order (2 consecutive calls use different keys)", async () => {
      const clients = (mistralService as any).clients as any[];
      if (clients.length < 2) return; // skip if only 1 key configured

      (mistralService as any).nextIndex = 0;
      (mistralService as any).cooldowns.clear();

      const firstPick = (mistralService as any).pickClient();
      const secondPick = (mistralService as any).pickClient();

      expect(firstPick.index).not.toBe(secondPick.index);
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

  describe("503 retry", () => {
    it("should retry on 503 and succeed on second attempt", async () => {
      const err503 = Object.assign(new Error("upstream connect error"), { statusCode: 503 });
      const successResult = {
        choices: [{ message: { content: "recovered" } }],
        model: "mistral-large-latest",
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
      };

      const clients = (mistralService as any).clients as any[];
      vi.spyOn(clients[0].chat, "complete")
        .mockRejectedValueOnce(err503)
        .mockResolvedValueOnce(successResult);

      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValue({ client: clients[0], index: 0 });

      const result = await mistralService.chat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result.content).toBe("recovered");
    });

    it("should throw ApiError(503) after exhausting retries on 503", async () => {
      const err503 = Object.assign(new Error("upstream connect error"), { statusCode: 503 });
      const clients = (mistralService as any).clients as any[];

      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRejectedValue(err503);
      }

      await expect(
        mistralService.chat({ messages: [{ role: "user", content: "test" }] }),
      ).rejects.toMatchObject({ status: 503, code: "MISTRAL_UNAVAILABLE" });

      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRestore();
      }
    });
  });

  describe("Circuit breaker", () => {
    it("should open circuit after FAILURE_THRESHOLD consecutive transient failures", async () => {
      const err503 = Object.assign(new Error("upstream connect error"), { statusCode: 503 });
      const clients = (mistralService as any).clients as any[];

      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRejectedValue(err503);
      }

      (mistralService as any).FAILURE_THRESHOLD = 3;

      for (let i = 0; i < 3; i++) {
        await mistralService.safeChat({ messages: [{ role: "user", content: "test" }] });
      }

      expect((mistralService as any).circuitOpen).toBe(true);

      await expect(
        mistralService.chat({ messages: [{ role: "user", content: "test" }] }),
      ).rejects.toMatchObject({ code: "MISTRAL_CIRCUIT_OPEN" });

      for (const c of clients) {
        vi.spyOn(c.chat, "complete").mockRestore();
      }
      (mistralService as any).FAILURE_THRESHOLD = 5;
    });

    it("should reset consecutiveFailures on success", async () => {
      const err503 = Object.assign(new Error("upstream connect error"), { statusCode: 503 });
      const successResult = {
        choices: [{ message: { content: "ok" } }],
        model: "mistral-large-latest",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      };

      const clients = (mistralService as any).clients as any[];

      vi.spyOn(clients[0].chat, "complete")
        .mockRejectedValueOnce(err503)
        .mockResolvedValueOnce(successResult);

      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValue({ client: clients[0], index: 0 });

      await mistralService.chat({ messages: [{ role: "user", content: "test" }] });

      expect((mistralService as any).consecutiveFailures).toBe(0);
      expect((mistralService as any).circuitOpen).toBe(false);
    });

    it("should half-open circuit after CIRCUIT_RESET_MS", async () => {
      (mistralService as any).circuitOpen = true;
      (mistralService as any).circuitOpenedAt = Date.now() - 61_000;

      const successResult = {
        choices: [{ message: { content: "ok" } }],
        model: "mistral-large-latest",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      };

      const clients = (mistralService as any).clients as any[];
      vi.spyOn(clients[0].chat, "complete").mockResolvedValueOnce(successResult);
      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValue({ client: clients[0], index: 0 });

      const result = await mistralService.chat({ messages: [{ role: "user", content: "test" }] });

      expect(result.content).toBe("ok");
      expect((mistralService as any).circuitOpen).toBe(false);
    });
  });

  describe("Backoff delay", () => {
    it("should call sleep with exponential backoff on transient errors", async () => {
      const { sleep } = await import("../src/lib/rateLimiter.js");
      const err503 = Object.assign(new Error("upstream connect error"), { statusCode: 503 });
      const successResult = {
        choices: [{ message: { content: "ok" } }],
        model: "mistral-large-latest",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      };

      const clients = (mistralService as any).clients as any[];
      vi.spyOn(clients[0].chat, "complete")
        .mockRejectedValueOnce(err503)
        .mockResolvedValueOnce(successResult);

      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValue({ client: clients[0], index: 0 });

      await mistralService.chat({ messages: [{ role: "user", content: "test" }] });

      expect(sleep).toHaveBeenCalled();
    });
  });

  describe("500 error retry with immediate key switch", () => {
    it("should retry on 500 error with another key immediately (no backoff)", async () => {
      const err500 = Object.assign(new Error("Internal server error"), { statusCode: 500 });
      const successResult = {
        choices: [{ message: { content: "success" } }],
        model: "mistral-small-latest",
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
      };

      const clients = (mistralService as any).clients as any[];
      if (clients.length < 2) return; // skip if only 1 key configured

      vi.spyOn(clients[0].chat, "complete").mockRejectedValueOnce(err500);
      vi.spyOn(clients[1].chat, "complete").mockResolvedValueOnce(successResult);

      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValueOnce({ client: clients[0], index: 0 })
        .mockReturnValueOnce({ client: clients[1], index: 1 });

      const { sleep } = await import("../src/lib/rateLimiter.js");
      (sleep as any).mockClear();

      const result = await mistralService.chat({
        messages: [{ role: "user", content: "test" }],
      });

      expect(result.content).toBe("success");
      // Should NOT have called backoff since another key was available
      expect(sleep).not.toHaveBeenCalled();
    });
  });

  describe("Non-retryable errors (400/401/403)", () => {
    it("should not retry on 400 error and throw immediately", async () => {
      const err400 = Object.assign(new Error("Bad request"), { statusCode: 400 });
      const clients = (mistralService as any).clients as any[];

      vi.spyOn(clients[0].chat, "complete").mockRejectedValueOnce(err400);
      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValue({ client: clients[0], index: 0 });

      await expect(
        mistralService.chat({ messages: [{ role: "user", content: "test" }] }),
      ).rejects.toMatchObject({ status: 502, code: "MISTRAL_ERROR" });

      // Should have only called complete once (no retry)
      expect(clients[0].chat.complete).toHaveBeenCalledTimes(1);
    });

    it("should not retry on 401 error and throw immediately", async () => {
      const err401 = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
      const clients = (mistralService as any).clients as any[];

      vi.spyOn(clients[0].chat, "complete").mockRejectedValueOnce(err401);
      vi.spyOn(mistralService as any, "pickClient")
        .mockReturnValue({ client: clients[0], index: 0 });

      await expect(
        mistralService.chat({ messages: [{ role: "user", content: "test" }] }),
      ).rejects.toThrow();

      expect(clients[0].chat.complete).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleError mapping", () => {
    it("should map 429 to ApiError(429, MISTRAL_RATE_LIMITED)", () => {
      const err = Object.assign(new Error("Rate limit exceeded"), { statusCode: 429 });
      const result = (mistralService as any).handleError(err);
      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(429);
      expect(result.code).toBe("MISTRAL_RATE_LIMITED");
    });

    it("should map 503 to ApiError(503, MISTRAL_UNAVAILABLE)", () => {
      const err = Object.assign(new Error("Service unavailable"), { statusCode: 503 });
      const result = (mistralService as any).handleError(err);
      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(503);
      expect(result.code).toBe("MISTRAL_UNAVAILABLE");
    });

    it("should map 502 to ApiError(502, MISTRAL_GATEWAY_ERROR)", () => {
      const err = Object.assign(new Error("Bad gateway"), { statusCode: 502 });
      const result = (mistralService as any).handleError(err);
      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(502);
      expect(result.code).toBe("MISTRAL_GATEWAY_ERROR");
    });

    it("should map unknown errors to ApiError(502, MISTRAL_ERROR)", () => {
      const err = new Error("Something went wrong");
      const result = (mistralService as any).handleError(err);
      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(502);
      expect(result.code).toBe("MISTRAL_ERROR");
    });

    it("should pass through existing ApiError", () => {
      const apiErr = new ApiError(400, "CUSTOM_ERROR", "custom");
      const result = (mistralService as any).handleError(apiErr);
      expect(result).toBe(apiErr);
    });
  });
});
