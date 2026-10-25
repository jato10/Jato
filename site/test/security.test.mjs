import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const require = createRequire(import.meta.url);

test('vercel.json and the generated _headers carry the same security headers', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const fromConfig = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));
  const generated = fs.readFileSync(path.join(root, 'site', 'public', '_headers'), 'utf8');
  for (const [key, value] of Object.entries(fromConfig)) {
    assert.ok(generated.includes(`  ${key}: ${value}`), `_headers is missing or differs on ${key}`);
  }
});

function call(handler, req) {
  return new Promise((resolve) => {
    const out = { status: 200 };
    const res = {
      setHeader() {},
      status(code) { out.status = code; return res; },
      json(body) { out.body = body; resolve(out); },
      end() { resolve(out); },
    };
    handler(req, res);
  });
}

test('the contact endpoint rejects cross-site posts, brakes bursts and ignores bots', async () => {
  process.env.RESEND_API_KEY = 'test';
  process.env.CONTACT_TO = 'owner@example.com';
  let upstream = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { upstream += 1; return { ok: true, status: 200, text: async () => '' }; };
  try {
    const handler = require(path.join(root, 'api', 'contact.js'));
    const base = { method: 'POST', headers: { host: 'globalbeyondllc.com', 'x-forwarded-for': '203.0.113.7', accept: 'application/json' } };
    const body = { name: 'A', phone: '1', message: 'hello', lang: 'es' };

    const foreign = await call(handler, { ...base, headers: { ...base.headers, origin: 'https://evil.example' }, body });
    assert.equal(foreign.status, 403);
    assert.equal(upstream, 0);

    const bot = await call(handler, { ...base, body: { ...body, company: 'spam' } });
    assert.equal(bot.status, 200);
    assert.equal(upstream, 0);

    const statuses = [];
    for (let i = 0; i < 8; i += 1) statuses.push((await call(handler, { ...base, body })).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429, 429]);
    assert.equal(upstream, 5);
  } finally {
    globalThis.fetch = realFetch;
  }
});
