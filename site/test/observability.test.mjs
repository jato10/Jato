import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ANALYTICS_INIT, INLINE_BOOT, SPEED_INSIGHTS_INIT } from '../src/template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(target) : entry.name.endsWith('.html') ? [target] : [];
  });
}

test('every generated page loads Analytics and Speed Insights once', () => {
  for (const file of htmlFiles(publicDir)) {
    const html = fs.readFileSync(file, 'utf8');
    assert.equal((html.match(/\/_vercel\/insights\/script\.js/g) || []).length, 1, file);
    assert.equal((html.match(/\/_vercel\/speed-insights\/script\.js/g) || []).length, 1, file);
  }
});

test('the CSP permits each required inline bootstrap', () => {
  const config = JSON.parse(fs.readFileSync(path.join(publicDir, '..', '..', 'vercel.json'), 'utf8'));
  const csp = config.headers[0].headers.find(({ key }) => key === 'Content-Security-Policy').value;

  for (const source of [INLINE_BOOT, ANALYTICS_INIT, SPEED_INSIGHTS_INIT]) {
    const hash = crypto.createHash('sha256').update(source).digest('base64');
    assert.ok(csp.includes(`'sha256-${hash}'`), `missing CSP hash for ${source}`);
  }
});
