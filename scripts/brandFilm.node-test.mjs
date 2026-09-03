import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {BRAND_FILM, brandFilmIsLive} from '../app/lib/brandFilm.ts';

const source = readFileSync(
  new URL('../app/components/BrandFilm.tsx', import.meta.url),
  'utf8',
);

test('brand film is live from the Shopify CDN', () => {
  assert.equal(brandFilmIsLive(), true);
  assert.match(BRAND_FILM.videoUrl, /^https:\/\/cdn\.shopify\.com\/videos\//);
  assert.match(
    BRAND_FILM.posterUrl,
    /^https:\/\/cdn\.shopify\.com\/s\/files\//,
  );
  assert.equal(BRAND_FILM.durationSeconds, 45);
});

test('brand film waits for the visitor: a play control, no autoplay', () => {
  assert.doesNotMatch(source, /\bautoPlay\b/);
  assert.doesNotMatch(source, /\bloop\b/);
  assert.match(source, /\bmuted\b/);
  assert.match(source, /\bplaysInline\b/);
  assert.match(source, /className="brand-film-control"/);
  assert.match(source, /aria-label=\{copy\.action\}/);
  for (const state of ['idle', 'playing', 'paused', 'ended']) {
    assert.match(source, new RegExp('  ' + state + ': [{]label: '));
  }
});
