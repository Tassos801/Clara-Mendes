import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {hexToLinear} from '../app/components/cinematic/paintRenderer.ts';
import {BRAND} from '../app/content/brand.ts';
import {artistProducts} from '../app/lib/artistShops.ts';
import {CLOTHING_PAGE_ACCENT} from '../app/lib/clothingEditorial.ts';
import {
  CURATED_IMAGE_WIDTHS,
  CURATED_PRODUCTS,
  curatedDisplaySrc,
  curatedImageCopySrc,
  curatedImageSrcForWidth,
  curatedImageSrcSet,
} from '../app/lib/curatedProducts.ts';
import {YOUR_SKY_PAGE} from '../app/lib/featurePages.ts';
import {listGalleryPages} from '../app/lib/galleryPages.ts';
import {
  HERO_BACKDROP,
  HERO_BACKDROP_MEDIA,
  heroBackdropPreloads,
} from '../app/lib/heroBackdrop.ts';
import {storefrontImageLoader} from '../app/lib/imageLoader.ts';
import {LINE_RAIL_ENTRIES} from '../app/lib/lineRail.ts';
import {STOREFRONT_IMAGE_COPIES} from './lib/storefront-images.mjs';

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

/** A transparent image's copy: a PNG (passed through too), no ICC chunk. */
function assertPlainPng(src) {
  const file = publicFile(src);
  assert.ok(existsSync(file), `${src} exists`);
  const bytes = readFileSync(file);
  assert.equal(bytes.readUInt32BE(0), 0x89504e47, `${src} is a PNG`);
  assert.equal(bytes.includes(Buffer.from('iCCP')), false, `${src} carries no ICC profile`);
}

const COPY_PATHS = new Set(STOREFRONT_IMAGE_COPIES.map((copy) => copy.to));
const srcSetPaths = (srcSet) =>
  srcSet.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]);

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
  // Its own chunk, fetched only after the device gates, once the page has
  // loaded and the visitor first interacts; a mid-visit boot leaves what
  // is already on screen alone.
  const provider = read('app/components/cinematic/CinematicProvider.tsx');
  assert.match(provider, /await import\('\.\/cinematicExperience'\)/);
  assert.match(provider, /const pageLoaded = useAfterPageLoad\(\);/);
  assert.match(provider, /if \(!pageLoaded \|\| interacted\) return;/);
  assert.match(provider, /if \(!canvas \|\| !interacted\) return;/);
  assert.match(provider, /handle\.scan\(\{revealOnScreen: false\}\)/);
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

test('every curated storefront image has its JPEG copies', () => {
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
  const w1000 = curatedImageCopySrc(src, 1000);
  assert.match(w360, /\.w360\.jpg$/);

  assert.equal(curatedImageSrcForWidth(src, 100), w360);
  assert.equal(curatedImageSrcForWidth(src, 360), w360);
  assert.equal(curatedImageSrcForWidth(src, 361), w720);
  assert.equal(curatedImageSrcForWidth(src, 720), w720);
  assert.equal(curatedImageSrcForWidth(src, 721), w1000);
  // Past the original's 1000 px the full-size JPEG still stands in for the WebP.
  assert.equal(curatedImageSrcForWidth(src, 2000), w1000);
  assert.equal(curatedImageSrcSet(src), `${w360} 360w, ${w720} 720w, ${w1000} 1000w`);

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

test('every storefront image copy is a plain JPEG (PNG if transparent) at its listed width', async () => {
  assert.ok(STOREFRONT_IMAGE_COPIES.length >= 75);
  for (const copy of STOREFRONT_IMAGE_COPIES) {
    if (copy.format === 'png') assertPlainPng(copy.to);
    else assertPlainJpeg(copy.to);
    assert.equal(copy.to.endsWith(`.w${copy.width}.${copy.format}`), true, copy.to);
    const {width} = await sharp(publicFile(copy.to)).metadata();
    assert.equal(width, copy.width, copy.to);
    // The source stays for the scripts, feeds and social posts that use it.
    assert.ok(existsSync(publicFile(copy.src)), `${copy.src} kept`);
  }
});

test('pages show the plain copies, not the WebP or ICC-tagged originals', () => {
  const shown = (src, where) =>
    assert.ok(COPY_PATHS.has(src), `${where}: ${src} is a listed copy`);

  // Journal plates and the frame-only aside share the 460 px plate copies.
  const journal = read('app/routes/blogs.$blogHandle._index.tsx');
  assert.match(journal, /\$\{slug\}-0\$\{plate \+ 1\}\.w460\.jpg`/);
  assert.doesNotMatch(journal, /\.webp/);
  for (const slug of ['quiet-form', 'patina-blue', 'sunlit-mosaic', 'neo-deco', 'midnight-garden'])
    for (const plate of [1, 2])
      shown(`/images/product-art/${slug}/${slug}-0${plate}.w460.jpg`, 'journal');
  assert.match(
    read('app/routes/products.$handle.tsx'),
    /src="\/images\/product-art\/quiet-form\/quiet-form-01\.w460\.jpg"/,
  );

  // Our Story portrait and backdrop (also the Your Sky wall preview).
  shown(BRAND.letter.portrait, 'founder portrait');
  for (const file of ['app/routes/our-story.tsx', 'app/components/SkyConfigurator.tsx']) {
    const source = read(file);
    assert.doesNotMatch(source, /our-story-light\.jpg/, file);
    assert.match(source, /our-story-light\.w2560\.jpg/, file);
  }
  shown('/images/backdrops/our-story-light.w2560.jpg', 'our story');

  // Your Sky: hero, occasions and the twelve swatches.
  shown(YOUR_SKY_PAGE.hero.image.src, 'Your Sky hero');
  for (const occasion of YOUR_SKY_PAGE.occasions) shown(occasion.image, occasion.title);
  const sky = read('app/components/SkyConfigurator.tsx');
  assert.match(sky, /swatch-\$\{layout\}-\$\{id\}\.w240\.jpg/);
  assert.match(sky, /swatch-\$\{id\}-\$\{theme\}\.w240\.jpg/);
  assert.doesNotMatch(sky, /\.webp/);

  // Pastel Forms: each pot and the series (phones take the 960 px copy).
  const pastel = read('app/routes/pastel-forms.tsx');
  assert.match(pastel, /\$\{selected\.id\}\.w1200\.jpg`/);
  for (const id of ['blush-arc', 'sage-stem', 'blue-drift', 'butter-sun'])
    shown(`/images/pastel-plant-pots/${id}.w1200.jpg`, 'pastel pot');
  const series = pastel.match(/srcSet="([^"]+)"/);
  assert.ok(series, 'series srcSet');
  for (const src of srcSetPaths(series[1])) shown(src, 'pastel series');
  assert.doesNotMatch(pastel, /\.webp/);

  // Gallery-page heroes: mockups as 1000/1600 copies, editorial photos as
  // the plain JPEGs they already are.
  for (const page of listGalleryPages()) {
    if (page.hero.srcSet) {
      shown(page.hero.src, page.slug);
      for (const src of srcSetPaths(page.hero.srcSet)) shown(src, page.slug);
    } else {
      assertPlainJpeg(page.hero.src);
    }
  }
  assert.match(
    read('app/routes/collections.$handle.tsx'),
    /srcSet=\{page\.hero\.srcSet\}/,
  );

  // Clothing hero accent: transparent, so a PNG copy.
  shown(CLOTHING_PAGE_ACCENT.src, 'clothing accent');
  assert.match(CLOTHING_PAGE_ACCENT.src, /\.png$/);

  // Artists index: every museum sheet.
  const sheets = artistProducts().filter((product) => /\.sheet-small\./.test(product.sheet.src));
  assert.ok(sheets.length >= 20);
  for (const product of sheets) shown(product.sheet.src, product.handle);
});
