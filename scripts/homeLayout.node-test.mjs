import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(path.join(ROOT, 'app/routes/_index.tsx'), 'utf8');
const markup = home.slice(
  home.indexOf('<div className="commerce-home">'),
  home.indexOf('const HOMEPAGE_QUERY'),
);

test('below the hero follows the approved gallery-walk order', () => {
  const order = [
    'className="home-root"',
    'className="home-trust-band"',
    '<BrandFilm',
    'className="home-shop-accelerator"',
    '<CapsuleIndex',
    '<YourSkyTeaser',
    '<HomepageEditorial',
    'className="featured-grid-section"',
    'className="home-studio"',
  ];
  const positions = order.map((marker) => markup.indexOf(marker));
  positions.forEach((position, index) =>
    assert.notEqual(position, -1, `missing ${order[index]}`),
  );
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
    'homepage sections are out of order',
  );
});

test('the film sits on the ink chapter', () => {
  assert.match(markup, /<BrandFilm[^>]*chapter="ink"/);
});

test('the text carousel, stale Five moods grid and stock photo are gone', () => {
  assert.doesNotMatch(home, /featured-collections|category-carousel/);
  assert.doesNotMatch(home, /OriginalArtPreview/);
  assert.doesNotMatch(home, /story-section|home-story-return/);
  assert.doesNotMatch(home, /collections\(first:/);
});
