import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSource = (relativePath) =>
  readFileSync(path.join(ROOT, relativePath), 'utf8');

const homepageSource = readSource('app/routes/_index.tsx');
const appCss = readSource('app/styles/app.css');

/** The homepage's first reduced-motion block (hero, header). */
function getReducedMotionCss() {
  const start = homepageSource.indexOf(
    '@media (prefers-reduced-motion: reduce)',
  );
  assert.notEqual(start, -1, 'missing the reduced-motion fallbacks');
  const end = homepageSource.indexOf('\n}\n', start);
  assert.ok(end > start, 'the reduced-motion block must close');
  return homepageSource.slice(start, end);
}

test('the short homepage renders its sections in order', () => {
  const order = [
    'className="home-root"',
    '<LineRail',
    'className="home-trust-band"',
    'className="home-journal-teaser"',
  ].map((marker) => {
    const index = homepageSource.indexOf(marker);
    assert.notEqual(index, -1, `missing ${marker}`);
    return index;
  });
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
    'sections out of order',
  );
  assert.match(homepageSource, /<LineRail entries=\{LINE_RAIL_ENTRIES\} \/>/);
  // The Letters card carries the sign-up; the footer's copy stays off `/`.
  assert.match(
    homepageSource,
    /html:has\(\.home-root\) \.newsletter--footer\s*\{[^}]*display:\s*none/,
  );
});

test('the homepage makes no Storefront call and the cut sections stay gone', () => {
  assert.match(
    homepageSource,
    /return \{seoUrl: getCanonicalUrl\(request, '\/'\)\};/,
  );
  assert.doesNotMatch(
    homepageSource,
    /home-curiosity|HeroTiles|OriginalArtPreview|HOMEPAGE_QUERY|HOME_TILE_PRICES_QUERY|storefront\.query|hc-tile/,
  );
  for (const file of [
    'app/components/HeroTiles.tsx',
    'app/lib/homeTilePrices.ts',
    'scripts/homeTilePrices.node-test.mjs',
  ]) {
    assert.equal(existsSync(path.join(ROOT, file)), false, `${file} is back`);
  }
});

test('links() only preloads the hero images', () => {
  const start = homepageSource.indexOf('export const links');
  assert.notEqual(start, -1);
  const links = homepageSource.slice(
    start,
    homepageSource.indexOf('];', start),
  );
  assert.doesNotMatch(links, /rel: 'stylesheet'/);
  assert.equal(links.match(/rel: 'preload'/g)?.length, 2);
});

test('the site header returns once the hero pill scrolls away', () => {
  assert.match(homepageSource, /ref=\{headerRef\} className="hm-header-top"/);
  assert.match(homepageSource, /new IntersectionObserver\(/);
  assert.match(homepageSource, /HOME_PAST_HERO_CLASS = 'home-past-hero'/);
  assert.match(
    homepageSource,
    /html:has\(\.home-root\):not\(\.home-past-hero\) \.site-header\s*\{[^}]*display:\s*none/,
  );
  assert.match(
    homepageSource,
    /html\.home-past-hero \.site-header\s*\{[^}]*animation:\s*homeHeaderIn 320ms/,
  );
  assert.match(homepageSource, /@keyframes homeHeaderIn/);
  // The old unconditional rule would keep the header hidden for good.
  assert.doesNotMatch(homepageSource, /html:has\(\.home-root\) \.site-header/);
  assert.match(
    getReducedMotionCss(),
    /html\.home-past-hero \.site-header\s*\{[^}]*animation:\s*none;/,
  );
});

test('the custom cursor needs a mouse', () => {
  assert.match(
    homepageSource,
    /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/,
  );
  assert.match(
    homepageSource,
    /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/,
  );
});

test('the removed bands and their files stay gone', () => {
  assert.doesNotMatch(
    homepageSource,
    /ArtistShopsFeature|YourSkyTeaser|ClothingFeature|BookNookShelf|ToughCaseTeaser|FramedArtFeature|HomepageEditorial|BrandFilm|pastel-pot-teaser|home-story-return|artist-feature\.css|market-selector/,
  );
  for (const file of [
    'app/components/ArtistShopsFeature.tsx',
    'app/styles/artist-feature.css',
    'app/components/YourSkyTeaser.tsx',
    'app/components/ClothingFeature.tsx',
    'app/components/BookNookShelf.tsx',
    'app/components/ToughCaseTeaser.tsx',
    'app/components/FramedArtFeature.tsx',
    'app/components/HomepageEditorial.tsx',
    'app/content/homeEditorial.ts',
    'app/components/BrandFilm.tsx',
  ]) {
    assert.equal(existsSync(path.join(ROOT, file)), false, `${file} is back`);
  }
  assert.doesNotMatch(
    appCss,
    /\.sky-teaser|\.pastel-pot-teaser|\.brand-film|\.home-film|\.case-teaser/,
  );
});
