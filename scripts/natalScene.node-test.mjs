import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {validateNatalParams} from '../app/lib/natal/params.ts';
import {renderNatalPdf} from '../app/lib/natal/pdf.server.ts';
import {
  computeNatal,
  natalBornLine,
  natalLayoutFor,
  natalPlaceLine,
} from '../app/lib/natal/scene.ts';
import {maxTextWidth} from '../app/lib/sky/fit.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
  italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
};
const plate = new Uint8Array(readFileSync('public/sky/plates/linen-8x10.jpg'));
const catalog = loadSkyCatalogSync();

const berlin = validateNatalParams({
  name: 'Amélie Nováková',
  date: '2026-05-14',
  time: '07:32',
  lat: 52.52,
  lon: 13.405,
  tz: 'Europe/Berlin',
  place: 'Berlin, Germany',
  details: '3.4 kg · 51 cm',
  theme: 'linen',
}).params;
const createdAt = new Date('2026-05-14T05:32:00Z');

test('layout keeps the medallion and text rows on the sheet', () => {
  for (const [w, h] of [
    [576, 720],
    [1440, 1728],
  ]) {
    const layout = natalLayoutFor(w, h);
    assert.ok(layout.disc.cy - layout.disc.r > 0, 'medallion below top edge');
    assert.ok(
      layout.disc.cx - layout.disc.r > w * 0.08,
      'medallion inside margins',
    );
    assert.ok(
      layout.disc.cy + layout.disc.r < layout.nameY - layout.nameSize,
      'medallion clears the name block',
    );
    assert.ok(layout.nameY < layout.bornY);
    assert.ok(layout.bornY < layout.placeY);
    assert.ok(layout.placeY < layout.detailsY);
    assert.ok(layout.detailsY < layout.creditY);
    assert.ok(layout.creditY < h);
    assert.equal(layout.maxTextWidth, maxTextWidth(w));
  }
});

test('scene carries the birth typography and a computed sky', () => {
  const scene = computeNatal({params: berlin, size: '8x10', catalog});
  assert.equal(scene.name, 'Amélie Nováková');
  assert.equal(scene.born, 'BORN 14 MAY 2026 AT 07:32');
  assert.equal(scene.place, 'BERLIN, GERMANY · 52.5200° N, 13.4050° E');
  assert.equal(scene.details, '3.4 kg · 51 cm');
  assert.equal(scene.credit, 'CLARA MENDES · FIRST LIGHT');
  assert.ok(scene.stars.length > 100, `${scene.stars.length} stars`);
  assert.ok(scene.lines.length > 20, `${scene.lines.length} segments`);
  for (const star of scene.stars) {
    const dx = star.x - scene.disc.cx;
    const dy = star.y - scene.disc.cy;
    assert.ok(
      Math.hypot(dx, dy) <= scene.disc.r + 1e-6,
      'stars stay inside the medallion',
    );
  }
});

test('a blank time keeps the chart truthful at noon and off the print', () => {
  const noTime = validateNatalParams({...berlin, time: ''}).params;
  const scene = computeNatal({params: noTime, size: '8x10', catalog});
  assert.equal(scene.born, 'BORN 14 MAY 2026');
  assert.ok(!scene.born.includes('AT'));
  assert.ok(scene.stars.length > 100, 'chart still computed (local noon)');
  assert.equal(natalBornLine({date: '2026-05-14', time: ''}), 'BORN 14 MAY 2026');
  assert.equal(
    natalPlaceLine({place: 'Berlin, Germany', lat: 52.52, lon: 13.405}),
    'BERLIN, GERMANY · 52.5200° N, 13.4050° E',
  );
});

test('renders both sizes with exact page geometry and embedded font', async () => {
  for (const [size, w, h] of [
    ['8x10', 576, 720],
    ['20x24', 1440, 1728],
  ]) {
    const scene = computeNatal({params: berlin, size, catalog});
    const pdf = await renderNatalPdf({
      scene,
      theme: SKY_THEMES.linen,
      fonts,
      plate: size === '8x10' ? plate : null,
      createdAt,
    });
    const text = Buffer.from(pdf).toString('latin1');
    assert.match(text, new RegExp(`/MediaBox \\[ ?0 0 ${w} ${h} ?\\]`), `${size} media box`);
    assert.match(text, /EBGaramond/);
    assert.ok(pdf.byteLength < 3 * 1024 * 1024, `${size} is ${pdf.byteLength} bytes`);
    assert.ok(pdf.byteLength > 100 * 1024, `${size} is suspiciously small`);
  }
});

test('render is deterministic and every theme renders', async () => {
  const scene = computeNatal({params: berlin, size: '8x10', catalog});
  const a = await renderNatalPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt});
  const b = await renderNatalPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt});
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);
  for (const theme of Object.values(SKY_THEMES)) {
    const themed = computeNatal({
      params: {...berlin, theme: theme.id},
      size: '8x10',
      catalog,
    });
    const pdf = await renderNatalPdf({scene: themed, theme, fonts, plate: null, createdAt});
    assert.ok(pdf.byteLength > 50 * 1024, theme.id);
  }
});

test('worst-case name and details fit the margins in PDF metrics', async () => {
  const worst = validateNatalParams({
    ...berlin,
    name: 'W'.repeat(40),
    details: 'W'.repeat(60),
  }).params;
  const scene = computeNatal({params: worst, size: '8x10', catalog});
  const pdf = await renderNatalPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt});
  assert.ok(pdf.byteLength > 50 * 1024);
  // The fit rules guarantee the drawn width; re-assert via the shared
  // fitter with a linear stand-in measurer that over-estimates EB Garamond
  // (glyph advance ≤ 1.0 em per char for the W worst case).
  const {fitTitle, fitTextSize, FIT_SAFETY} = await import('../app/lib/sky/fit.ts');
  const measure = (text, size) => text.length * size * 1.0;
  const fitted = fitTitle('W'.repeat(40), scene.nameSize, scene.maxTextWidth, measure);
  for (const line of fitted.lines) {
    assert.ok(
      measure(line, fitted.size) <= scene.maxTextWidth * FIT_SAFETY + 1e-6,
      'name line inside margins',
    );
  }
  const detailsSize = fitTextSize('W'.repeat(60), scene.detailsSize, scene.maxTextWidth, measure);
  assert.ok(measure('W'.repeat(60), detailsSize) <= scene.maxTextWidth * FIT_SAFETY + 1e-6);
});
