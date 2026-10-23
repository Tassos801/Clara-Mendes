import assert from 'node:assert/strict';
import test from 'node:test';
import {BRAND_FILM, brandFilmIsLive} from '../app/lib/brandFilm.ts';

// The film left the homepage on 2026-10-23 and is embedded nowhere on the
// storefront; it stays on the Shopify CDN, recorded in app/lib/brandFilm.ts.
test('brand film is live from the Shopify CDN', () => {
  assert.equal(brandFilmIsLive(), true);
  assert.match(BRAND_FILM.videoUrl, /^https:\/\/cdn\.shopify\.com\/videos\//);
  assert.match(
    BRAND_FILM.posterUrl,
    /^https:\/\/cdn\.shopify\.com\/s\/files\//,
  );
  assert.equal(BRAND_FILM.durationSeconds, 45);
});
