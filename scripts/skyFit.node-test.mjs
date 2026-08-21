import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {fitSubtitle, fitTextSize, fitTitle, maxTextWidth, trackedWidth} from '../app/lib/sky/fit.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const measure = (text, size) => text.length * size * 0.5; // fake 0.5em glyphs

test('fitTextSize leaves short text alone and shrinks long text proportionally', () => {
  assert.equal(fitTextSize('short', 30, 400, measure), 30);
  // 40 chars × 0.5em × 30 = 600 > 388 (400 less the 3 % safety) → 19.4
  assert.ok(Math.abs(fitTextSize('x'.repeat(40), 30, 400, measure) - 19.4) < 1e-9);
  // never below the minimum scale
  assert.equal(fitTextSize('x'.repeat(400), 30, 400, measure), 30 * 0.4);
  // Subtitle: fits on one line with mild shrink, otherwise splits in two.
  assert.deepEqual(fitSubtitle({place: 'PARIS, FRANCE', rest: '14 JUNE 2019'}, 10, 400, measure), {lines: ['PARIS, FRANCE · 14 JUNE 2019'], size: 10});
  const long = fitSubtitle({place: 'X'.repeat(100), rest: 'Y'.repeat(40)}, 10, 400, measure);
  assert.deepEqual(long.lines, ['X'.repeat(100), 'Y'.repeat(40)]);
  assert.ok(Math.abs(long.size - 7.76) < 1e-9); // 100 × 0.5em × 7.76 = 388
  // Title: mild shrink on one line, then a two-line break at the middle space.
  assert.deepEqual(fitTitle('The night we met', 30, 400, measure), {lines: ['The night we met'], size: 30});
  const broken = fitTitle('X'.repeat(30) + ' ' + 'Y'.repeat(30), 30, 400, measure); // 61 chars: 549 > 400 even at 60 %
  assert.equal(broken.lines.length, 2);
  assert.ok(broken.lines.every((l) => measure(l, broken.size) <= 400));
  const unbreakable = fitTitle('W'.repeat(40), 30, 400, measure); // no spaces → floor scale
  assert.deepEqual(unbreakable.lines, ['W'.repeat(40)]);
  assert.ok(Math.abs(unbreakable.size - 19.4) < 1e-9);
  assert.equal(fitTextSize('', 30, 400, measure), 30);
  assert.equal(maxTextWidth(576), 576 * 0.84);
  assert.equal(trackedWidth('abc', 10, 2, measure), 15 + 4);
});

/** Inflate every FlateDecode stream in a PDF and return the text operators. */
function contentStreams(pdf) {
  const bytes = Buffer.from(pdf);
  const text = bytes.toString('latin1');
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    const end = text.indexOf('endstream', start);
    if (end < 0) break;
    const chunk = bytes.subarray(start, end);
    try {
      out.push(inflateSync(chunk).toString('latin1'));
    } catch {
      // not a Flate stream (fonts, images) — skip
    }
    re.lastIndex = end;
  }
  return out.join('\n');
}

test('a 40-character title stays inside the sheet margins in the PDF', async () => {
  const fonts = {
    regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
    italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
  };
  const catalog = loadSkyCatalogSync();
  const title = 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'; // 40 × widest glyph, no spaces
  const params = validateSkyParams({
    date: '2019-06-14',
    time: '22:00',
    lat: 48.8566,
    lon: 2.3522,
    tz: 'Europe/Paris',
    place: 'Saint-Rémy-de-Provence-les-Alpilles, France',
    title,
    theme: 'linen',
  }).params;
  const scene = computeSky({params, size: '8x10', catalog});
  const pdf = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt: new Date('2019-06-14T00:00:00Z')});
  const ops = contentStreams(pdf);
  // pdf-lib positions every text run with "1 0 0 1 x y Tm". The cardinal
  // letters hug the horizon ring by design, so they are excluded.
  const cardinalYs = scene.cardinal.map((c) => Number((720 - c.y).toFixed(3)));
  const runs = [...ops.matchAll(/1 0 0 1 ([-\d.]+) ([-\d.]+) Tm/g)].map((m) => ({x: Number(m[1]), y: Number(m[2])}));
  const xs = runs.filter((r) => !cardinalYs.some((y) => Math.abs(y - r.y) < 0.01)).map((r) => r.x);
  assert.ok(xs.length > 10, `found ${xs.length} text runs`);
  const margin = (576 - scene.maxTextWidth) / 2;
  assert.ok(
    xs.every((x) => x >= margin - 0.5),
    `a text run starts left of the margin: ${Math.min(...xs)} < ${margin}`,
  );
  // The title was actually shrunk: its font size operator is below the
  // design size of 30 pt.
  const sizes = [...ops.matchAll(/\/EBGaramond-[\w-]+ ([\d.]+) Tf/g)].map((m) => Number(m[1]));
  assert.ok(sizes.some((s) => s < 30 && s >= 30 * 0.3), `title sizes: ${[...new Set(sizes)].join(', ')}`);
});
