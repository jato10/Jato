import {
  PerplexityRouterService,
  PerplexityModelNotFoundError,
  PerplexityModelNotAvailableError,
  PerplexityRateLimitError
} from '../src/services/perplexity_router';

function apiError(status: number, headers?: Record<string, string>): Error & { status: number; headers?: Record<string, string> } {
  const error = new Error(`API error ${status}`) as Error & { status: number; headers?: Record<string, string> };
  error.status = status;
  error.headers = headers;
  return error;
}

describe('PerplexityRouterService', () => {
  const originalEnv = process.env.PERPLEXITY_API_KEY;

  afterEach(() => {
    process.env.PERPLEXITY_API_KEY = originalEnv;
  });

  test('throws a clear error when no API key is configured', () => {
    delete process.env.PERPLEXITY_API_KEY;
    expect(() => new PerplexityRouterService('')).toThrow(/PERPLEXITY_API_KEY/);
  });

  test('listModels() returns this key\'s catalog from GET /router/v1/models', async () => {
    const models = [{ id: 'anthropic/claude-sonnet-5' }, { id: 'openai/gpt-5.6-terra' }];
    const openai = { models: { list: jest.fn().mockResolvedValue({ data: models }) } } as any;
    const service = new PerplexityRouterService('test-key', { openai });

    const result = await service.listModels();

    expect(result).toEqual(models);
    expect(openai.models.list).toHaveBeenCalledTimes(1);
  });

  test('chatCompletion() returns the OpenAI-compatible response unchanged on success', async () => {
    const response = { choices: [{ message: { role: 'assistant', content: 'hi' } }] };
    const openai = { chat: { completions: { create: jest.fn().mockResolvedValue(response) } } } as any;
    const service = new PerplexityRouterService('test-key', { openai });

    const result = await service.chatCompletion({
      model: 'anthropic/claude-sonnet-5',
      messages: [{ role: 'user', content: 'hi' }]
    });

    expect(result).toBe(response);
  });

  test('chatCompletion() maps HTTP 400 to PerplexityModelNotFoundError', async () => {
    const openai = { chat: { completions: { create: jest.fn().mockRejectedValue(apiError(400)) } } } as any;
    const service = new PerplexityRouterService('test-key', { openai });

    await expect(
      service.chatCompletion({ model: 'made-up/not-real', messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toBeInstanceOf(PerplexityModelNotFoundError);
  });

  test('chatCompletion() maps HTTP 402 to PerplexityModelNotAvailableError', async () => {
    const openai = { chat: { completions: { create: jest.fn().mockRejectedValue(apiError(402)) } } } as any;
    const service = new PerplexityRouterService('test-key', { openai });

    await expect(
      service.chatCompletion({ model: 'anthropic/claude-opus-5', messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toBeInstanceOf(PerplexityModelNotAvailableError);
  });

  test('chatCompletion() maps HTTP 429 to PerplexityRateLimitError and preserves Retry-After', async () => {
    const openai = {
      chat: { completions: { create: jest.fn().mockRejectedValue(apiError(429, { 'retry-after': '12' })) } }
    } as any;
    const service = new PerplexityRouterService('test-key', { openai });

    let caught: unknown;
    try {
      await service.chatCompletion({ model: 'openai/gpt-5.6-terra', messages: [{ role: 'user', content: 'hi' }] });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PerplexityRateLimitError);
    expect((caught as PerplexityRateLimitError).retryAfterSeconds).toBe(12);
  });

  test('sendMessage() returns the Anthropic-compatible response unchanged on success', async () => {
    const response = { content: [{ type: 'text', text: 'hi' }] };
    const anthropic = { messages: { create: jest.fn().mockResolvedValue(response) } } as any;
    const service = new PerplexityRouterService('test-key', { anthropic });

    const result = await service.sendMessage({
      model: 'anthropic/claude-sonnet-5',
      max_tokens: 64,
      messages: [{ role: 'user', content: 'hi' }]
    });

    expect(result).toBe(response);
  });

  test('sendMessage() maps HTTP 400 to PerplexityModelNotFoundError', async () => {
    const anthropic = { messages: { create: jest.fn().mockRejectedValue(apiError(400)) } } as any;
    const service = new PerplexityRouterService('test-key', { anthropic });

    await expect(
      service.sendMessage({ model: 'made-up/not-real', max_tokens: 64, messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toBeInstanceOf(PerplexityModelNotFoundError);
  });
});
