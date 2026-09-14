import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// OpenAI-compatible Chat Completions: POST {base}/chat/completions -> /router/v1/chat/completions
const CHAT_COMPLETIONS_BASE_URL = 'https://api.perplexity.ai/router/v1';
// The Anthropic SDK appends "/v1/messages" itself, so the base URL omits the trailing "/v1".
const MESSAGES_BASE_URL = 'https://api.perplexity.ai/router';

/** Thrown when a model slug isn't in this API key's Router catalog (HTTP 400). */
export class PerplexityModelNotFoundError extends Error {
  constructor(model: string) {
    super(
      `Model "${model}" is not in the Perplexity Router catalog. Call listModels() ` +
      '(GET /router/v1/models) for this key\'s current allowlist instead of guessing a slug.'
    );
    this.name = 'PerplexityModelNotFoundError';
  }
}

/** Thrown when a model exists but is excluded for the organization's usage tier (HTTP 402). */
export class PerplexityModelNotAvailableError extends Error {
  constructor(model: string) {
    super(
      `Model "${model}" is excluded for this organization's usage tier. ` +
      'See https://docs.perplexity.ai/docs/getting-started/pricing.'
    );
    this.name = 'PerplexityModelNotAvailableError';
  }
}

/** Thrown on HTTP 429 (rate limit or, for the Router API, temporary model overload). */
export class PerplexityRateLimitError extends Error {
  public readonly retryAfterSeconds?: number;

  constructor(retryAfterSeconds?: number) {
    super(
      retryAfterSeconds !== undefined
        ? `Perplexity Router rate limited the request; retry after ${retryAfterSeconds}s.`
        : 'Perplexity Router rate limited the request.'
    );
    this.name = 'PerplexityRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function extractRetryAfterSeconds(error: unknown): number | undefined {
  const headers = (error as { headers?: unknown } | undefined)?.headers;
  let raw: string | null | undefined;
  if (headers instanceof Headers) {
    raw = headers.get('retry-after');
  } else if (headers && typeof headers === 'object') {
    raw = (headers as Record<string, string>)['retry-after'];
  }
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : undefined;
}

/** Maps a raised OpenAI/Anthropic SDK APIError onto a Router-specific error where one applies. */
function toRouterError(error: unknown, model: string): Error {
  const status = (error as { status?: number } | undefined)?.status;
  if (status === 400) return new PerplexityModelNotFoundError(model);
  if (status === 402) return new PerplexityModelNotAvailableError(model);
  if (status === 429) return new PerplexityRateLimitError(extractRetryAfterSeconds(error));
  return error instanceof Error ? error : new Error(String(error));
}

export interface PerplexityRouterClients {
  openai?: OpenAI;
  anthropic?: Anthropic;
}

/**
 * Routes chat calls through the Perplexity Router API (https://api.perplexity.ai/router),
 * giving access to frontier models from Anthropic, OpenAI, Google, xAI, and Perplexity through
 * a single key, without depending on any one provider's SDK for model access. Model ids are
 * "creator/model-name" slugs; use listModels() to get this key's tier-aware catalog rather than
 * hardcoding one.
 */
export class PerplexityRouterService {
  private readonly openai: OpenAI;
  private readonly anthropic: Anthropic;

  constructor(apiKey: string = process.env.PERPLEXITY_API_KEY ?? '', clients: PerplexityRouterClients = {}) {
    if (!apiKey) {
      throw new Error(
        'PERPLEXITY_API_KEY is not set. Create a key in the API Console (https://console.perplexity.ai) ' +
        'and export it as PERPLEXITY_API_KEY in your own terminal before using PerplexityRouterService.'
      );
    }
    this.openai = clients.openai ?? new OpenAI({ apiKey, baseURL: CHAT_COMPLETIONS_BASE_URL });
    this.anthropic = clients.anthropic ?? new Anthropic({ apiKey, baseURL: MESSAGES_BASE_URL });
  }

  /**
   * Lists this API key's model catalog via GET /router/v1/models. The response is both the
   * catalog and the allowlist for this key's usage tier — validate model ids against it rather
   * than inventing a "creator/model-name" slug.
   */
  public async listModels(): Promise<OpenAI.Models.Model[]> {
    const page = await this.openai.models.list();
    return page.data;
  }

  /** OpenAI-compatible Chat Completions: POST /router/v1/chat/completions. Returns one `choices` entry. */
  public async chatCompletion(
    params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
  ): Promise<OpenAI.Chat.ChatCompletion> {
    try {
      return await this.openai.chat.completions.create(params);
    } catch (error) {
      throw toRouterError(error, params.model);
    }
  }

  /** Streaming Chat Completions; requests a final usage chunk via stream_options.include_usage. */
  public async streamChatCompletion(
    params: Omit<OpenAI.Chat.ChatCompletionCreateParamsStreaming, 'stream' | 'stream_options'>
  ): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
    try {
      return await this.openai.chat.completions.create({
        ...params,
        stream: true,
        stream_options: { include_usage: true }
      });
    } catch (error) {
      throw toRouterError(error, params.model);
    }
  }

  /** Anthropic-compatible Messages: POST /router/v1/messages. Returns `content` blocks, no `choices`. */
  public async sendMessage(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> {
    try {
      return await this.anthropic.messages.create(params);
    } catch (error) {
      throw toRouterError(error, params.model);
    }
  }

  /** Streaming Messages; emits typed events from `message_start` through `message_stop`. */
  public streamMessage(
    params: Omit<Anthropic.MessageCreateParamsStreaming, 'stream'>
  ): AsyncIterable<Anthropic.MessageStreamEvent> {
    return this.anthropic.messages.stream(params);
  }
}
