import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  isTrueTypeFont,
  loadSkyFonts,
  PDF_FONT_PATHS,
} from '../app/lib/sky/fonts.server.ts';

const ttf = {
  regular: readFileSync('public/fonts/EBGaramond-Regular.ttf'),
  italic: readFileSync('public/fonts/EBGaramond-Italic.ttf'),
};

test('the PDF font copies are byte-identical to the site fonts', () => {
  for (const face of ['regular', 'italic']) {
    const bin = readFileSync(`public${PDF_FONT_PATHS[face]}`);
    assert.equal(Buffer.compare(bin, ttf[face]), 0, `${face} .bin differs from .ttf`);
    assert.ok(PDF_FONT_PATHS[face].endsWith('.bin'), 'a font extension would be transcoded by the CDN');
  }
});

test('only TrueType font programs pass the check', () => {
  assert.equal(isTrueTypeFont(new Uint8Array(ttf.regular)), true);
  assert.equal(isTrueTypeFont(new TextEncoder().encode('wOF2rest')), false);
  assert.equal(isTrueTypeFont(new TextEncoder().encode('wOFFrest')), false);
  assert.equal(isTrueTypeFont(new TextEncoder().encode('true')), true);
  assert.equal(isTrueTypeFont(new Uint8Array([0, 1])), false);
});

test('the loader rejects a transcoded (WOFF2) font and recovers once TrueType is served', async () => {
  const realFetch = globalThis.fetch;
  let serveWoff2 = true;
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    assert.ok(Object.values(PDF_FONT_PATHS).includes(path), `unexpected fetch ${path}`);
    const body = serveWoff2
      ? new TextEncoder().encode('wOF2 pretend')
      : new Uint8Array(path.includes('Italic') ? ttf.italic : ttf.regular);
    return new Response(body, {status: 200});
  };
  try {
    const base = new URL('https://shop.example/api/sky-print/x.pdf');
    await assert.rejects(loadSkyFonts(base), /not a TrueType font/);
    serveWoff2 = false; // a failed load is not cached
    const fonts = await loadSkyFonts(base);
    assert.equal(fonts.regular.byteLength, ttf.regular.byteLength);
    assert.equal(fonts.italic.byteLength, ttf.italic.byteLength);
  } finally {
    globalThis.fetch = realFetch;
  }
});
