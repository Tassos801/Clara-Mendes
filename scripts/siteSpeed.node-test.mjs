import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {hexToLinear} from '../app/components/cinematic/paintRenderer.ts';
import {
  CURATED_IMAGE_WIDTHS,
  CURATED_PRODUCTS,
  curatedDisplaySrc,
  curatedImageCopySrc,
  curatedImageSrcForWidth,
  curatedImageSrcSet,
} from '../app/lib/curatedProducts.ts';
import {
  HERO_BACKDROP,
  HERO_BACKDROP_MEDIA,
  heroBackdropPreloads,
} from '../app/lib/heroBackdrop.ts';
import {storefrontImageLoader} from '../app/lib/imageLoader.ts';
import {LINE_RAIL_ENTRIES} from '../app/lib/lineRail.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) =>
  readFileSync(path.join(ROOT, relativePath), 'utf8');
const publicFile = (src) => path.join(ROOT, 'public', src);

/**
 * Oxygen re-encodes WebP and ICC-tagged JPEGs into larger JPEGs but passes
 * a plain JPEG through, so the images we size by hand must stay plain.
 */
function assertPlainJpeg(src) {
  const file = publicFile(src);
  assert.ok(existsSync(file), `${src} exists`);
  const bytes = readFileSync(file);
  assert.equal(bytes.readUInt16BE(0), 0xffd8, `${src} is a JPEG`);
  assert.equal(
    bytes.includes(Buffer.from('ICC_PROFILE')),
    false,
    `${src} carries no ICC profile`,
  );
}

test('the cinematic layer needs no Three.js or GSAP', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const name of ['three', 'gsap', '@types/three']) {
    assert.equal(pkg.dependencies?.[name], undefined, `${name} dependency`);
    assert.equal(pkg.devDependencies?.[name], undefined, `${name} devDependency`);
  }
  for (const file of [
    'app/components/cinematic/CinematicProvider.tsx',
    'app/components/cinematic/cinematicExperience.ts',
    'app/components/cinematic/chapterOrchestrator.ts',
    'app/components/cinematic/paintRenderer.ts',
  ]) {
    assert.doesNotMatch(read(file), /from 'three'|from 'gsap|import\('(three|gsap)/);
  }
  // Still downloaded only after the device gates, as its own chunk.
  assert.match(
    read('app/components/cinematic/CinematicProvider.tsx'),
    /await import\('\.\/cinematicExperience'\)/,
  );
});

test('palettes convert to linear light exactly as Three.js did', () => {
  const [r, g, b] = hexToLinear('#f4f0e6');
  assert.ok(Math.abs(r - 0.9047) < 1e-3, `r ${r}`);
  assert.ok(Math.abs(g - 0.8714) < 1e-3, `g ${g}`);
  assert.ok(Math.abs(b - 0.7913) < 1e-3, `b ${b}`);
  assert.deepEqual(hexToLinear('#000000'), [0, 0, 0]);
  assert.deepEqual(hexToLinear('#ffffff'), [1, 1, 1]);
});

test('the hero backdrop ships as plain JPEGs with one preload per query', () => {
  for (const src of Object.values(HERO_BACKDROP)) assertPlainJpeg(src);

  const preloads = heroBackdropPreloads();
  assert.deepEqual(
    preloads.map((link) => [link.href, link.media]),
    [
      [HERO_BACKDROP.mobile, HERO_BACKDROP_MEDIA.mobile],
      [HERO_BACKDROP.desktop, HERO_BACKDROP_MEDIA.desktop],
      [HERO_BACKDROP.large, HERO_BACKDROP_MEDIA.large],
    ],
  );
  for (const link of preloads) {
    assert.equal(link.rel, 'preload');
    assert.equal(link.as, 'image');
    // Not held back behind the render-blocking stylesheets.
    assert.equal(link.fetchpriority, 'high');
  }

  // Both heroes paint from the shared files under the shared queries.
  for (const file of ['app/routes/_index.tsx', 'app/routes/collections.all.tsx']) {
    const source = read(file);
    assert.match(source, /url\(\$\{HERO_BACKDROP\.desktop\}\)/, file);
    assert.match(source, /@media \$\{HERO_BACKDROP_MEDIA\.large\}/, file);
    assert.match(source, /url\(\$\{HERO_BACKDROP\.mobile\}\)/, file);
    assert.doesNotMatch(source, /hero-interior[^'"`)]*\.webp/, file);
  }
  assert.match(
    read('app/routes/_index.tsx'),
    /export const links: Route\.LinksFunction = \(\) => heroBackdropPreloads\(\);/,
  );
});

test('rail circles are small plain JPEGs', () => {
  for (const entry of LINE_RAIL_ENTRIES) {
    if (!entry.image.src.startsWith('/images/')) continue;
    assertPlainJpeg(entry.image.src);
    // The ring is at most 120 CSS px; 360 px covers a 3x screen.
    assert.equal(
      Math.min(entry.image.width, entry.image.height),
      360,
      entry.key,
    );
  }
});

test('every curated storefront image has its small JPEG copies', () => {
  for (const product of CURATED_PRODUCTS) {
    for (const image of product.images ?? []) {
      const src = curatedDisplaySrc(image);
      for (const width of CURATED_IMAGE_WIDTHS) {
        assertPlainJpeg(curatedImageCopySrc(src, width));
      }
    }
  }
});

test('curated images resolve to the nearest copy; Shopify images keep CDN sizing', () => {
  const src = curatedDisplaySrc(CURATED_PRODUCTS[0].images[0]);
  const w360 = curatedImageCopySrc(src, 360);
  const w720 = curatedImageCopySrc(src, 720);
  assert.match(w360, /\.w360\.jpg$/);

  assert.equal(curatedImageSrcForWidth(src, 100), w360);
  assert.equal(curatedImageSrcForWidth(src, 360), w360);
  assert.equal(curatedImageSrcForWidth(src, 361), w720);
  assert.equal(curatedImageSrcForWidth(src, 720), w720);
  assert.equal(curatedImageSrcForWidth(src, 1200), src);
  assert.equal(curatedImageSrcSet(src), `${w360} 360w, ${w720} 720w, ${src} 1000w`);

  assert.equal(storefrontImageLoader({src, width: 400, height: 500, crop: 'center'}), w720);
  assert.equal(
    storefrontImageLoader({
      src: 'https://cdn.shopify.com/s/files/1/a.jpg?v=1',
      width: 400,
      height: 500,
      crop: 'center',
    }),
    'https://cdn.shopify.com/s/files/1/a.jpg?v=1&width=400&height=500&crop=center',
  );
  // Unknown local files and cut-outs are left alone.
  assert.equal(curatedImageSrcForWidth('/images/other/a.webp', 360), '/images/other/a.webp');
  assert.equal(curatedImageSrcSet('/images/other/a.webp'), undefined);
});
