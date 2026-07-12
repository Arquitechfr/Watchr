import { Mistral } from "@mistralai/mistralai";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";
import { mistralRateLimiter } from "../lib/rateLimiter.js";
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
  private client: Mistral | null = null;

  constructor() {
    if (env.MISTRAL_API_KEY) {
      this.client = new Mistral({ apiKey: env.MISTRAL_API_KEY });
      log("MistralService", "initialized", { hasApiKey: true });
    } else {
      log("MistralService", "not configured — MISTRAL_API_KEY missing");
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private ensureClient(): Mistral {
    if (!this.client) {
      throw new ApiError(503, "MISTRAL_NOT_CONFIGURED", "Mistral AI service is not configured (MISTRAL_API_KEY missing)");
    }
    return this.client;
  }

  async chat(params: MistralChatParams): Promise<MistralChatResult> {
    const client = this.ensureClient();
    const model = params.model ?? DEFAULT_CHAT_MODEL;
    const messages = injectProjectContext(params.messages);

    log("MistralService", "chat request", { model, messageCount: messages.length });

    await mistralRateLimiter.consume();

    const startTime = Date.now();
    const totalPromptLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const feature = params.feature ?? "unknown";
    const promptText = messages.map((m) => `[${m.role}] ${m.content}`).join("\n");
    const MAX_LOG_LENGTH = 5000;

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
        },
      }).catch(() => {});

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
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);

      logError("MistralService", "chat error", err, { model });

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
        },
      }).catch(() => {});

      throw this.handleError(err);
    }
  }

  async streamChat(params: MistralChatParams): Promise<AsyncIterable<{ content: string; done: boolean }>> {
    const client = this.ensureClient();
    const model = params.model ?? DEFAULT_CHAT_MODEL;
    const messages = injectProjectContext(params.messages);

    log("MistralService", "stream chat request", { model, messageCount: messages.length });

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

      return generator();
    } catch (err) {
      logError("MistralService", "stream chat error", err, { model });
      throw this.handleError(err);
    }
  }

  async embeddings(params: MistralEmbeddingsParams): Promise<MistralEmbeddingsResult> {
    const client = this.ensureClient();
    const model = params.model ?? DEFAULT_EMBEDDINGS_MODEL;

    log("MistralService", "embeddings request", { model, inputCount: params.inputs.length });

    await mistralRateLimiter.consume();

    const startTime = Date.now();
    const totalInputLength = params.inputs.reduce((sum, input) => sum + input.length, 0);

    try {
      const result = await client.embeddings.create({
        model,
        inputs: params.inputs,
      });

      const embeddings = result.data?.map((item) => item.embedding).filter((e): e is number[] => e !== undefined) ?? [];
      const latencyMs = Date.now() - startTime;

      log("MistralService", "embeddings response", { model, count: embeddings.length });

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
        },
      }).catch(() => {});

      return {
        embeddings,
        model: result.model ?? model,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);

      logError("MistralService", "embeddings error", err, { model });

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
        },
      }).catch(() => {});

      throw this.handleError(err);
    }
  }

  private handleError(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    const message = err instanceof Error ? err.message : String(err);
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
