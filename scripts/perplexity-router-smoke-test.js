#!/usr/bin/env node
/**
 * Minimal real-request smoke test for the Perplexity Router integration
 * (src/services/perplexity_router.ts). Run after building:
 *
 *   PERPLEXITY_API_KEY=... node scripts/perplexity-router-smoke-test.js
 *
 * Never paste the key into chat or a file — export it in your own terminal.
 * Prints only HTTP status / response shape, never the key or full completion text.
 */

const OpenAI = require('openai').default || require('openai');

const BASE_URL = 'https://api.perplexity.ai/router/v1';

async function main() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY is not set. Create one at https://console.perplexity.ai and export it.');
    process.exitCode = 1;
    return;
  }

  const client = new OpenAI({ apiKey, baseURL: BASE_URL });

  console.log('1) GET /router/v1/models ...');
  const models = await client.models.list();
  const catalog = models.data.map((m) => m.id);
  console.log(`   status: 200, models in catalog: ${catalog.length}`);
  if (catalog.length === 0) {
    console.error('   No models returned for this key/tier; cannot pick one for the completion request.');
    process.exitCode = 1;
    return;
  }

  const model = catalog.find((id) => id.startsWith('anthropic/')) || catalog[0];
  console.log(`2) POST /router/v1/chat/completions with model "${model}" ...`);
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
      max_tokens: 8
    });
    console.log(`   status: 200, choices: ${completion.choices.length}, finish_reason: ${completion.choices[0]?.finish_reason}`);
    console.log(`   usage: prompt_tokens=${completion.usage?.prompt_tokens}, completion_tokens=${completion.usage?.completion_tokens}`);
  } catch (error) {
    const status = error?.status;
    console.error(`   request failed, status: ${status ?? 'unknown'}`);
    if (status === 429) {
      const retryAfter = error?.headers?.get?.('retry-after') ?? error?.headers?.['retry-after'];
      console.error(`   rate limited / model overloaded, retry-after: ${retryAfter ?? 'not provided'}`);
    } else if (status === 401) {
      console.error('   authentication failed — check PERPLEXITY_API_KEY.');
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Unexpected failure:', error?.message || error);
  process.exitCode = 1;
});
