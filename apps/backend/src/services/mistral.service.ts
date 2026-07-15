import { Mistral } from "@mistralai/mistralai";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";
import { mistralRateLimiter, sleep } from "../lib/rateLimiter.js";
import { AiLog } from "../models/aiLog.model.js";

export interface MistralChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MistralChatParams {
  model?: string;
  fallbackModel?: string;
  messages: MistralChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "text" | "json_object" };
  feature?: string;
}

export interface MistralChatResult {
  content: string;
  model: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface MistralEmbeddingsParams {
  model?: string;
  inputs: string[];
}

export interface MistralEmbeddingsResult {
  embeddings: number[][];
  model: string;
}

const DEFAULT_CHAT_MODEL = "mistral-large-latest";
const DEFAULT_EMBEDDINGS_MODEL = "mistral-embed";
const PREFERRED_SMALL_MODEL = "mistral-small-latest";
const FALLBACK_CHAT_MODEL = "mistral-large-latest";

export { PREFERRED_SMALL_MODEL, FALLBACK_CHAT_MODEL };

const PROJECT_CONTEXT = `You are assisting with "Watchr", a TV show and movie tracking app (successor to TV Time). Features: watch-status tracking, ratings, public comments on shows/episodes, GDPR import from TV Time, Trakt sync. The app supports English and French. Audience: TV/movie enthusiasts. Tone: friendly, professional, concise.`;

function injectProjectContext(messages: MistralChatMessage[]): MistralChatMessage[] {
  if (messages.length === 0) {
    return [{ role: "system", content: PROJECT_CONTEXT }];
  }
  if (messages[0].role === "system") {
    return [{ role: "system", content: `${PROJECT_CONTEXT}\n\n${messages[0].content}` }, ...messages.slice(1)];
  }
  return [{ role: "system", content: PROJECT_CONTEXT }, ...messages];
}

class MistralService {
  private clients: Mistral[] = [];
  private cooldowns: Map<number, number> = new Map();
  private readonly COOLDOWN_MS = 60_000;
  private readonly MAX_RETRIES = 3;
  private readonly BACKOFF_BASE_MS = 1_000;
  private readonly BACKOFF_CAP_MS = 10_000;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_RESET_MS = 60_000;
  private circuitOpen = false;
  private circuitOpenedAt = 0;
  private consecutiveFailures = 0;

  constructor() {
    if (env.MISTRAL_API_KEY) {
      const keys = env.MISTRAL_API_KEY.split(",").map((k) => k.trim()).filter(Boolean);
      this.clients = keys.map((key) => new Mistral({ apiKey: key }));
      log("MistralService", "initialized", { apiKeysCount: this.clients.length });
    } else {
      log("MistralService", "not configured — MISTRAL_API_KEY missing");
    }
  }

  isConfigured(): boolean {
    return this.clients.length > 0;
  }

  getApiKeysCount(): number {
    return this.clients.length;
  }

  private pickClient(): { client: Mistral; index: number } {
    if (this.clients.length === 0) {
      throw new ApiError(503, "MISTRAL_NOT_CONFIGURED", "Mistral AI service is not configured (MISTRAL_API_KEY missing)");
    }

    const now = Date.now();
    const available = this.clients
      .map((_, i) => i)
      .filter((i) => !this.cooldowns.has(i) || this.cooldowns.get(i)! <= now);

    if (available.length > 0) {
      const index = available[Math.floor(Math.random() * available.length)];
      this.cooldowns.delete(index);
      return { client: this.clients[index], index };
    }

    let minIndex = 0;
    let minCooldown = Infinity;
    for (const [i, end] of this.cooldowns) {
      if (end < minCooldown) {
        minCooldown = end;
        minIndex = i;
      }
    }

    this.cooldowns.delete(minIndex);
    log("MistralService", "all keys were in cooldown, reusing least-recently-cooled key", { keyIndex: minIndex });
    return { client: this.clients[minIndex], index: minIndex };
  }

  private isRateLimitError(err: unknown): boolean {
    const anyErr = err as Record<string, unknown>;
    if (anyErr?.status === 429 || anyErr?.statusCode === 429 || anyErr?.code === 429) return true;
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes("429") || msg.includes("rate limit")) return true;
    }
    return false;
  }

  private isTransientError(err: unknown): boolean {
    if (this.isRateLimitError(err)) return true;
    const anyErr = err as Record<string, unknown>;
    const status = anyErr?.statusCode ?? anyErr?.status ?? anyErr?.code;
    if (status === 503 || status === 502 || status === 504) return true;
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes("503") || msg.includes("502") || msg.includes("504")) return true;
      if (msg.includes("service unavailable") || msg.includes("bad gateway") || msg.includes("gateway timeout")) return true;
      if (msg.includes("upstream connect error") || msg.includes("connection refused")) return true;
    }
    return false;
  }

  private async backoffDelay(attempt: number): Promise<void> {
    const delay = Math.min(this.BACKOFF_CAP_MS, this.BACKOFF_BASE_MS * Math.pow(2, attempt));
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    await sleep(Math.max(0, delay + jitter));
  }

  private checkCircuit(): void {
    if (!this.circuitOpen) return;
    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed >= this.CIRCUIT_RESET_MS) {
      this.circuitOpen = false;
      log("MistralService", "circuit breaker half-open, allowing probe request");
      return;
    }
    throw new ApiError(503, "MISTRAL_CIRCUIT_OPEN", "Mistral AI circuit breaker is open — service temporarily unavailable");
  }

  private recordSuccess(): void {
    if (this.consecutiveFailures > 0 || this.circuitOpen) {
      log("MistralService", "circuit breaker closed, failures reset", { previousFailures: this.consecutiveFailures });
    }
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD && !this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      log("MistralService", "circuit breaker opened", {
        consecutiveFailures: this.consecutiveFailures,
        resetMs: this.CIRCUIT_RESET_MS,
      });
    }
  }

  private markCooldown(index: number): void {
    this.cooldowns.set(index, Date.now() + this.COOLDOWN_MS);
    log("MistralService", "key cooldown started", { keyIndex: index, cooldownMs: this.COOLDOWN_MS });
  }

  async chat(params: MistralChatParams): Promise<MistralChatResult> {
    const model = params.model ?? DEFAULT_CHAT_MODEL;
    const messages = injectProjectContext(params.messages);

    log("MistralService", "chat request", { model, messageCount: messages.length });

    this.checkCircuit();
    await mistralRateLimiter.consume();

    const startTime = Date.now();
    const totalPromptLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const feature = params.feature ?? "unknown";
    const promptText = messages.map((m) => `[${m.role}] ${m.content}`).join("\n");
    const MAX_LOG_LENGTH = 5000;

    let lastErr: unknown = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const { client, index } = this.pickClient();

      try {
        const result = await client.chat.complete({
          model,
          messages,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          responseFormat: params.responseFormat,
        });

        const content = result.choices?.[0]?.message?.content ?? "";
        const textContent = typeof content === "string" ? content : JSON.stringify(content);
        const latencyMs = Date.now() - startTime;

        log("MistralService", "chat response", {
          model,
          usage: result.usage,
          keyIndex: index,
        });

        AiLog.create({
          service: "MistralService",
          action: "chat",
          feature,
          status: "success",
          aiModel: result.model ?? model,
          tokens: {
            prompt: result.usage?.promptTokens ?? 0,
            completion: result.usage?.completionTokens ?? 0,
            total: result.usage?.totalTokens ?? 0,
          },
          latencyMs,
          prompt: promptText.slice(0, MAX_LOG_LENGTH),
          response: textContent.slice(0, MAX_LOG_LENGTH),
          metadata: {
            promptLength: totalPromptLength,
            responseLength: textContent.length,
            messageCount: messages.length,
            keyIndex: index,
          },
        }).catch(() => {});

        this.recordSuccess();
        return {
          content: textContent,
          model: result.model ?? model,
          usage: {
            promptTokens: result.usage?.promptTokens,
            completionTokens: result.usage?.completionTokens,
            totalTokens: result.usage?.totalTokens,
          },
        };
      } catch (err) {
        lastErr = err;

        if (this.isTransientError(err) && attempt < this.MAX_RETRIES) {
          if (this.isRateLimitError(err)) {
            this.markCooldown(index);
          }
          this.recordFailure();
          log("MistralService", "chat transient error, retrying with backoff", {
            keyIndex: index,
            attempt: attempt + 1,
            maxRetries: this.MAX_RETRIES,
            error: err instanceof Error ? err.message : String(err),
          });
          await this.backoffDelay(attempt);
          continue;
        }

        if (this.isTransientError(err)) {
          this.recordFailure();
        }

        const latencyMs = Date.now() - startTime;
        const message = err instanceof Error ? err.message : String(err);

        logError("MistralService", "chat error", err, { model, keyIndex: index, attempt });

        AiLog.create({
          service: "MistralService",
          action: "chat",
          feature,
          status: "error",
          aiModel: model,
          tokens: { prompt: 0, completion: 0, total: 0 },
          latencyMs,
          errorMessage: message,
          prompt: promptText.slice(0, MAX_LOG_LENGTH),
          metadata: {
            promptLength: totalPromptLength,
            messageCount: messages.length,
            keyIndex: index,
          },
        }).catch(() => {});

        throw this.handleError(err);
      }
    }

    throw this.handleError(lastErr);
  }

  async streamChat(params: MistralChatParams): Promise<AsyncIterable<{ content: string; done: boolean }>> {
    const model = params.model ?? DEFAULT_CHAT_MODEL;
    const messages = injectProjectContext(params.messages);

    log("MistralService", "stream chat request", { model, messageCount: messages.length });

    this.checkCircuit();
    let lastErr: unknown = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const { client, index } = this.pickClient();

      try {
        const stream = await client.chat.stream({
          model,
          messages,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          responseFormat: params.responseFormat,
        });

        async function* generator(): AsyncIterable<{ content: string; done: boolean }> {
          for await (const chunk of stream) {
            const delta = chunk.data.choices[0]?.delta?.content;
            if (delta) {
              const text = typeof delta === "string" ? delta : JSON.stringify(delta);
              yield { content: text, done: false };
            }
          }
          yield { content: "", done: true };
        }

        this.recordSuccess();
        return generator();
      } catch (err) {
        lastErr = err;

        if (this.isTransientError(err) && attempt < this.MAX_RETRIES) {
          if (this.isRateLimitError(err)) {
            this.markCooldown(index);
          }
          this.recordFailure();
          log("MistralService", "stream chat transient error, retrying with backoff", {
            keyIndex: index,
            attempt: attempt + 1,
            maxRetries: this.MAX_RETRIES,
            error: err instanceof Error ? err.message : String(err),
          });
          await this.backoffDelay(attempt);
          continue;
        }

        if (this.isTransientError(err)) {
          this.recordFailure();
        }

        logError("MistralService", "stream chat error", err, { model, keyIndex: index, attempt });
        throw this.handleError(err);
      }
    }

    throw this.handleError(lastErr);
  }

  async embeddings(params: MistralEmbeddingsParams): Promise<MistralEmbeddingsResult> {
    const model = params.model ?? DEFAULT_EMBEDDINGS_MODEL;

    log("MistralService", "embeddings request", { model, inputCount: params.inputs.length });

    this.checkCircuit();
    await mistralRateLimiter.consume();

    const startTime = Date.now();
    const totalInputLength = params.inputs.reduce((sum, input) => sum + input.length, 0);

    let lastErr: unknown = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const { client, index } = this.pickClient();

      try {
        const result = await client.embeddings.create({
          model,
          inputs: params.inputs,
        });

        const embeddings = result.data?.map((item) => item.embedding).filter((e): e is number[] => e !== undefined) ?? [];
        const latencyMs = Date.now() - startTime;

        log("MistralService", "embeddings response", { model, count: embeddings.length, keyIndex: index });

        AiLog.create({
          service: "MistralService",
          action: "embeddings",
          status: "success",
          aiModel: result.model ?? model,
          tokens: { prompt: 0, completion: 0, total: 0 },
          latencyMs,
          metadata: {
            inputCount: params.inputs.length,
            totalInputLength,
            embeddingCount: embeddings.length,
            keyIndex: index,
          },
        }).catch(() => {});

        this.recordSuccess();
        return {
          embeddings,
          model: result.model ?? model,
        };
      } catch (err) {
        lastErr = err;

        if (this.isTransientError(err) && attempt < this.MAX_RETRIES) {
          if (this.isRateLimitError(err)) {
            this.markCooldown(index);
          }
          this.recordFailure();
          log("MistralService", "embeddings transient error, retrying with backoff", {
            keyIndex: index,
            attempt: attempt + 1,
            maxRetries: this.MAX_RETRIES,
            error: err instanceof Error ? err.message : String(err),
          });
          await this.backoffDelay(attempt);
          continue;
        }

        if (this.isTransientError(err)) {
          this.recordFailure();
        }

        const latencyMs = Date.now() - startTime;
        const message = err instanceof Error ? err.message : String(err);

        logError("MistralService", "embeddings error", err, { model, keyIndex: index, attempt });

        AiLog.create({
          service: "MistralService",
          action: "embeddings",
          status: "error",
          aiModel: model,
          tokens: { prompt: 0, completion: 0, total: 0 },
          latencyMs,
          errorMessage: message,
          metadata: {
            inputCount: params.inputs.length,
            totalInputLength,
            keyIndex: index,
          },
        }).catch(() => {});

        throw this.handleError(err);
      }
    }

    throw this.handleError(lastErr);
  }

  private handleError(err: unknown): ApiError {
    if (err instanceof ApiError) return err;

    const anyErr = err as Record<string, unknown>;
    const statusCode = (anyErr?.statusCode ?? anyErr?.status ?? anyErr?.code) as number | undefined;
    const message = err instanceof Error ? err.message : String(err);

    if (statusCode === 429) {
      return new ApiError(429, "MISTRAL_RATE_LIMITED", "Mistral AI rate limit exceeded");
    }
    if (statusCode === 503) {
      return new ApiError(503, "MISTRAL_UNAVAILABLE", "Mistral AI service temporarily unavailable");
    }
    if (statusCode === 502 || statusCode === 504) {
      return new ApiError(502, "MISTRAL_GATEWAY_ERROR", `Mistral AI gateway error: ${message}`);
    }

    return new ApiError(502, "MISTRAL_ERROR", `Mistral AI error: ${message}`);
  }

  async safeChat(params: MistralChatParams): Promise<MistralChatResult | null> {
    try {
      return await this.chat(params);
    } catch (err) {
      logError("MistralService", "safeChat swallowed error", err);
      return null;
    }
  }

  async safeChatWithFallback(params: MistralChatParams): Promise<MistralChatResult | null> {
    const primaryModel = params.model ?? DEFAULT_CHAT_MODEL;
    const fallbackModel = params.fallbackModel ?? FALLBACK_CHAT_MODEL;

    const primaryResult = await this.safeChat({ ...params, model: primaryModel });
    if (primaryResult) {
      return primaryResult;
    }

    if (primaryModel === fallbackModel) {
      return null;
    }

    log("MistralService", "primary model failed, falling back", {
      primaryModel,
      fallbackModel,
      feature: params.feature ?? "unknown",
    });

    return this.safeChat({ ...params, model: fallbackModel });
  }

  async safeEmbeddings(params: MistralEmbeddingsParams): Promise<MistralEmbeddingsResult | null> {
    try {
      return await this.embeddings(params);
    } catch (err) {
      logError("MistralService", "safeEmbeddings swallowed error", err);
      return null;
    }
  }
}

export const mistralService = new MistralService();
