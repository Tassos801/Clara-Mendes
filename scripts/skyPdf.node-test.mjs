import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
  italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
};
const plate = new Uint8Array(readFileSync('public/sky/plates/linen.jpg'));
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
    const pdf = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate, createdAt});
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
