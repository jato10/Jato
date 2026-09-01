// Generates the Global Beyond LLC brand SVGs from real glyph outlines so the
// files are fully self-contained (no webfont dependency at render time).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', '..', 'public', 'assets', 'img');
fs.mkdirSync(out, { recursive: true });

const load = (f) => {
  const b = fs.readFileSync(path.join(here, f));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const serif = load('pf.ttf');      // Playfair Display 700 — monogram
const sans = load('jost4.ttf');    // Jost 300 — wordmark

const round = (n) => Math.round(n * 100) / 100;

/** Path data for a single glyph placed at (x, baseline). */
function glyphPath(font, char, size, x, baseline) {
  return font.getPath(char, x, baseline, size).toPathData(2);
}

/** Advance width of a char at a given size. */
function advance(font, char, size) {
  return font.charToGlyph(char).advanceWidth / font.unitsPerEm * size;
}

/** Tracked-out run of text, returned as { d, width }. */
function trackedText(font, text, size, tracking, x, baseline) {
  let cursor = x;
  const parts = [];
  for (const ch of text) {
    if (ch !== ' ') parts.push(glyphPath(font, ch, size, cursor, baseline));
    cursor += advance(font, ch, size) + tracking;
  }
  return { d: parts.join(' '), width: cursor - tracking - x };
}

function bbox(font, char, size) {
  const p = font.getPath(char, 0, 0, size);
  return p.getBoundingBox();
}

// ---------------------------------------------------------------- monogram
const MONO = 640;
const gBox = bbox(serif, 'G', MONO);
const bBox = bbox(serif, 'B', MONO);
const gW = gBox.x2 - gBox.x1;
const bW = bBox.x2 - bBox.x1;
const overlap = gW * 0.16;
const monoW = gW + bW - overlap;
const monoH = Math.max(gBox.y2, bBox.y2) - Math.min(gBox.y1, bBox.y1);

const gX = -gBox.x1;
const bX = gX + gW - overlap - bBox.x1;
const baseline = -Math.min(gBox.y1, bBox.y1);

const gPath = glyphPath(serif, 'G', MONO, gX, baseline);
const bPath = glyphPath(serif, 'B', MONO, bX, baseline);

// ------------------------------------------------------------------ swoosh
const SW_W = monoW * 1.42;
const swX = (monoW - SW_W) / 2;
const swY = monoH * 0.755;
const swoosh =
  `M ${round(swX)} ${round(swY + monoH * 0.20)} ` +
  `Q ${round(swX + SW_W * 0.45)} ${round(swY - monoH * 0.10)} ${round(swX + SW_W)} ${round(swY - monoH * 0.02)} ` +
  `Q ${round(swX + SW_W * 0.45)} ${round(swY + monoH * 0.055)} ${round(swX)} ${round(swY + monoH * 0.20)} Z`;

// ---------------------------------------------------------------- wordmark
const WORD = MONO * 0.20;
const TRACK = WORD * 0.30;
const word = trackedText(sans, 'GLOBAL BEYOND', WORD, TRACK, 0, 0);
const suffixSize = WORD * 0.58;
const suffix = trackedText(sans, 'LLC', suffixSize, suffixSize * 0.14, word.width + TRACK * 1.6, 0);
const wordTotal = word.width + TRACK * 1.6 + suffix.width;

// ------------------------------------------------------------------- layout
const PAD = MONO * 0.14;
const wordGap = MONO * 0.30;
const contentW = Math.max(monoW, wordTotal);
const W = round(contentW + PAD * 2);
const monoOffsetX = round(PAD + (contentW - monoW) / 2);
const wordOffsetX = round(PAD + (contentW - wordTotal) / 2);
const monoTop = PAD;
const wordBaseline = round(monoTop + monoH + wordGap + WORD * 0.72);
const H = round(wordBaseline + PAD);

const defs = (idPrefix) => `
    <linearGradient id="${idPrefix}-steel" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="14%" stop-color="#dce7f2"/>
      <stop offset="32%" stop-color="#8fa3b8"/>
      <stop offset="46%" stop-color="#f2f7fc"/>
      <stop offset="58%" stop-color="#9fb2c6"/>
      <stop offset="74%" stop-color="#5d6e83"/>
      <stop offset="88%" stop-color="#c8d6e4"/>
      <stop offset="100%" stop-color="#7c8da1"/>
    </linearGradient>
    <linearGradient id="${idPrefix}-arc" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0%" stop-color="#8296ad"/>
      <stop offset="26%" stop-color="#eef4fa"/>
      <stop offset="52%" stop-color="#ffffff"/>
      <stop offset="72%" stop-color="#a9bccf"/>
      <stop offset="100%" stop-color="#6f8095"/>
    </linearGradient>
    <linearGradient id="${idPrefix}-word" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f4f8fc"/>
      <stop offset="55%" stop-color="#c2d0de"/>
      <stop offset="100%" stop-color="#8b9bad"/>
    </linearGradient>`;

const markGroup = (p, x, y) => `
    <g transform="translate(${x} ${y})">
      <g fill="#2b3a4d" opacity="0.55" transform="translate(0 ${round(MONO * 0.018)})">
        <path d="${gPath}"/><path d="${bPath}"/>
      </g>
      <path d="${gPath}" fill="url(#${p}-steel)"/>
      <path d="${bPath}" fill="url(#${p}-steel)"/>
      <path d="${swoosh}" fill="#31435a" opacity="0.5" transform="translate(0 ${round(MONO * 0.02)})"/>
      <path d="${swoosh}" fill="url(#${p}-arc)"/>
    </g>`;

// ------------------------------------------------------- full lockup (logo)
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Global Beyond LLC">
  <defs>${defs('gb')}</defs>
  <title>Global Beyond LLC</title>
${markGroup('gb', monoOffsetX, monoTop)}
  <g transform="translate(${wordOffsetX} ${wordBaseline})" fill="url(#gb-word)">
    <path d="${word.d}"/>
    <path d="${suffix.d}"/>
  </g>
</svg>
`;
fs.writeFileSync(path.join(out, 'logo.svg'), logo);

// ------------------------------------------------------------- mark only
// The swoosh reaches past the letterforms on both sides; the mark's box has to
// contain the union of both or the arc gets clipped.
const MARK_PAD = MONO * 0.05;
const artLeft = Math.min(0, swX);
const artRight = Math.max(monoW, swX + SW_W);
const artW = artRight - artLeft;
const markW = round(artW + MARK_PAD * 2);
const markH = round(monoH * 1.04 + MARK_PAD * 2);
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${markW} ${markH}" role="img" aria-label="Global Beyond LLC">
  <defs>${defs('gbm')}</defs>
  <title>Global Beyond LLC</title>
${markGroup('gbm', round(MARK_PAD - artLeft), MARK_PAD)}
</svg>
`;
fs.writeFileSync(path.join(out, 'logo-mark.svg'), mark);

// --------------------------------------------------------------- favicon
const S = round(Math.max(artW, monoH) * 1.34);
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="Global Beyond LLC">
  <defs>${defs('gbf')}</defs>
  <title>Global Beyond LLC</title>
  <rect width="${S}" height="${S}" rx="${round(S * 0.22)}" fill="#080d17"/>
  <g transform="translate(${round((S - artW) / 2 - artLeft)} ${round((S - monoH) / 2 - monoH * 0.02)})">
    <g fill="#2b3a4d" opacity="0.55" transform="translate(0 ${round(MONO * 0.018)})">
      <path d="${gPath}"/><path d="${bPath}"/>
    </g>
    <path d="${gPath}" fill="url(#gbf-steel)"/>
    <path d="${bPath}" fill="url(#gbf-steel)"/>
    <path d="${swoosh}" fill="url(#gbf-arc)"/>
  </g>
</svg>
`;
fs.writeFileSync(path.join(out, 'favicon.svg'), favicon);

console.log(`logo.svg ${W}x${H} · logo-mark.svg ${markW}x${markH} · favicon.svg ${S}x${S}`);
