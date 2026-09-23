import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {computeSky} from '../app/lib/sky/scene.ts';
import {SKY_LAYOUT_IDS, validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
  italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
};
const plates = {
  '8x10': new Uint8Array(readFileSync('public/sky/plates/linen-8x10.jpg')),
  '20x24': new Uint8Array(readFileSync('public/sky/plates/linen-20x24.jpg')),
};
const catalog = loadSkyCatalogSync();
const params = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'Ωμέγα & Жизнь — the night we met',
  theme: 'linen',
}).params;
const createdAt = new Date('2019-06-14T20:00:00Z');

test('renders both sizes with exact page geometry and embedded font', async () => {
  for (const [size, w, h] of [
    ['8x10', 576, 720],
    ['20x24', 1440, 1728],
  ]) {
    const scene = computeSky({params, size, catalog});
    const pdf = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate: plates[size], createdAt});
    const text = Buffer.from(pdf).toString('latin1');
    assert.match(text, new RegExp(`/MediaBox \\[ ?0 0 ${w} ${h} ?\\]`), `${size} media box`);
    assert.match(text, /EBGaramond/);
    assert.match(text, /\/DCTDecode/, 'plate embedded as JPEG');
    assert.ok(pdf.byteLength < 3 * 1024 * 1024, `${size} is ${pdf.byteLength} bytes`);
    assert.ok(pdf.byteLength > 100 * 1024, `${size} is suspiciously small`);
  }
});

test('render is deterministic and survives a missing plate', async () => {
  const scene = computeSky({params, size: '8x10', catalog});
  const a = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt});
  const b = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt});
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);
  assert.doesNotMatch(Buffer.from(a).toString('latin1'), /\/DCTDecode/);
});

test('every theme renders', async () => {
  for (const theme of Object.values(SKY_THEMES)) {
    const scene = computeSky({params: {...params, theme: theme.id}, size: '8x10', catalog});
    const pdf = await renderSkyPdf({scene, theme, fonts, plate: null, createdAt});
    assert.ok(pdf.byteLength > 50 * 1024, theme.id);
  }
});

function contentStreams(pdf) {
  const text = Buffer.from(pdf).toString('latin1');
  const out = [];
  const re = /stream\r?\n/g;
  let match;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length;
    const end = text.indexOf('endstream', start);
    if (end < 0) break;
    try {
      out.push(inflateSync(Buffer.from(text.slice(start, end), 'latin1')).toString('latin1'));
    } catch {
      // not a Flate stream (fonts, images)
    }
    re.lastIndex = end;
  }
  return out.join('\n');
}

test('every layout × theme renders deterministically, clipped to the disc', async () => {
  for (const layout of SKY_LAYOUT_IDS) {
    for (const theme of Object.values(SKY_THEMES)) {
      const p = validateSkyParams({...params, layout, theme: theme.id, details: 'names,grid,time'}).params;
      const scene = computeSky({params: p, size: '8x10', catalog});
      const a = await renderSkyPdf({scene, theme, fonts, plate: null, createdAt});
      const b = await renderSkyPdf({scene, theme, fonts, plate: null, createdAt});
      assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0, `${layout}/${theme.id} deterministic`);
      assert.ok(a.byteLength < 3 * 1024 * 1024, `${layout}/${theme.id} ${a.byteLength} bytes`);
      // pdf-lib writes each operator on its own line: "W\nn".
      assert.match(contentStreams(a), /\bW\s+n\b/, `${layout}/${theme.id} clips to the disc`);
    }
  }
});

test('details add marks; a 20×24 compass with everything stays small', async () => {
  const plain = computeSky({params: validateSkyParams(params).params, size: '20x24', catalog});
  const rich = computeSky({
    params: validateSkyParams({...params, layout: 'compass', details: 'names,grid,time'}).params,
    size: '20x24',
    catalog,
  });
  const a = await renderSkyPdf({scene: plain, theme: SKY_THEMES.linen, fonts, plate: plates['20x24'], createdAt});
  const b = await renderSkyPdf({scene: rich, theme: SKY_THEMES.linen, fonts, plate: plates['20x24'], createdAt});
  assert.ok(contentStreams(b).length > contentStreams(a).length, 'names, grid and compass add content');
  assert.ok(b.byteLength < 3 * 1024 * 1024, `${b.byteLength} bytes`);
});
