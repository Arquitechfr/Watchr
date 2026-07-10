import { Mistral } from "@mistralai/mistralai";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { log, logError } from "../lib/logger.js";

export interface MistralChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MistralChatParams {
  model?: string;
  messages: MistralChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "text" | "json_object" };
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

      log("MistralService", "chat response", {
        model,
        usage: result.usage,
      });

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
      logError("MistralService", "chat error", err, { model });
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

    try {
      const result = await client.embeddings.create({
        model,
        inputs: params.inputs,
      });

      const embeddings = result.data?.map((item) => item.embedding).filter((e): e is number[] => e !== undefined) ?? [];

      log("MistralService", "embeddings response", { model, count: embeddings.length });

      return {
        embeddings,
        model: result.model ?? model,
      };
    } catch (err) {
      logError("MistralService", "embeddings error", err, { model });
      throw this.handleError(err);
    }
  }

  private handleError(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    const message = err instanceof Error ? err.message : String(err);
    return new ApiError(502, "MISTRAL_ERROR", `Mistral AI error: ${message}`);
  }
}

export const mistralService = new MistralService();
