import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  BOOK_NOOK_THEMES,
  bookNookDeliveryCountries,
  bookNookDeliveryPhrase,
  bookNookFactLine,
  bookNookSpecRows,
  bookNookThemesInUse,
  buildBookNookShelf,
  buildLevel,
  getBookNookTheme,
  releasedBookNooks,
} from '../app/lib/bookNooks.ts';
import {
  CURATED_PRODUCTS,
  curatedDisplaySrc,
  curatedDisplayTitle,
  curatedImages,
  deliveryIncludedPhrase,
  formatDeliveryCountries,
  withCuratedImages,
} from '../app/lib/curatedProducts.ts';
import {
  CUTOUT_HEIGHT,
  CUTOUT_WIDTH,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  recipeProblems,
} from './prepare-curated-product-images.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(import.meta.url)('sharp');
const nook = CURATED_PRODUCTS.find((p) => p.productType === 'Book Nooks');

test('every released book nook is ready for the shelf', async () => {
  const themes = new Set(BOOK_NOOK_THEMES.map((theme) => theme.slug));
  assert.ok(releasedBookNooks().length > 0);
  for (const product of releasedBookNooks()) {
    assert.ok(product.name, `${product.handle} needs a short name`);
    assert.ok(themes.has(product.theme), `${product.handle}: unknown theme`);
    assert.ok(product.tagline, `${product.handle} needs a tagline`);
    assert.ok(
      product.processing,
      `${product.handle} needs a processing estimate`,
    );
    // Pieces and build time are optional: many suppliers publish neither.
    assert.ok(product.specs?.sizeCm?.length === 3, `${product.handle} size`);
    assert.ok(product.specs?.lighting, `${product.handle} lighting`);
    assert.ok(
      (product.images?.length ?? 0) >= 2,
      `${product.handle} needs a studio and a lamplit image`,
    );
    assert.equal(
      product.images[0].from.layout,
      'studio',
      `${product.handle}: the first image is the linen studio shot`,
    );
    assert.deepEqual(recipeProblems(product), []);
    for (const image of product.images) {
      const file = path.join(root, 'public', image.src);
      assert.ok(existsSync(file), `${image.src} — run npm run curated:images`);
      const {width, height} = await sharp(file).metadata();
      assert.deepEqual([width, height], [IMAGE_WIDTH, IMAGE_HEIGHT]);
    }
    assert.ok(product.cutout, `${product.handle} needs a shelf cut-out`);
    const cutout = await sharp(
      path.join(root, 'public', product.cutout),
    ).metadata();
    assert.deepEqual(
      [cutout.width, cutout.height, cutout.hasAlpha],
      [CUTOUT_WIDTH, CUTOUT_HEIGHT, true],
    );
  }
});

test('lossless scene composites are served from a light storefront copy', async () => {
  // A phone on a cellular connection should never download the ~1 MB
  // lossless provenance file for a 160 px card or a 44 px thumbnail.
  let scenes = 0;
  for (const product of CURATED_PRODUCTS) {
    const served = curatedImages(product.handle);
    for (const [index, image] of (product.images ?? []).entries()) {
      const display = curatedDisplaySrc(image);
      assert.equal(served[index].url, display);
      if (!image.from?.background) {
        assert.equal(display, image.src, `${image.src} is already lossy`);
        continue;
      }
      scenes += 1;
      assert.match(display, /\.display\.webp$/);
      const file = path.join(root, 'public', display);
      assert.ok(existsSync(file), `${display} — run npm run curated:images`);
      const meta = await sharp(file).metadata();
      assert.deepEqual([meta.width, meta.height], [IMAGE_WIDTH, IMAGE_HEIGHT]);
      const {size} = await stat(file);
      const {size: master} = await stat(path.join(root, 'public', image.src));
      assert.ok(
        size < 250 * 1024,
        `${display} is ${Math.round(size / 1024)} KB`,
      );
      assert.ok(size < master / 3, `${display} should be far lighter`);
    }
  }
  assert.ok(scenes > 0, 'expected at least one scene composite');
});

test('image recipes are validated before anything is generated', () => {
  const broken = {
    handle: 'example-nook',
    images: [
      {
        src: '/images/elsewhere/a.webp',
        alt: 'x',
        from: {layout: 'photo', source: 'a.jpg', crop: [0, 0, 10, 10]},
      },
      {
        src: '/images/curated/example-nook/b.webp',
        alt: '',
        from: {layout: 'grid', source: 'b.jpg', tiles: [[0, 0, 1, 1]]},
      },
      {
        src: '/images/curated/example-nook/c.webp',
        alt: 'c',
        from: {layout: 'spiral', source: 'c.jpg'},
      },
    ],
    cutout: '/images/curated/example-nook/cutout.webp',
  };
  const problems = recipeProblems(broken).join('\n');
  assert.match(problems, /must live in \/images\/curated/);
  assert.match(problems, /alt text is required/);
  assert.match(problems, /at least two tiles/);
  assert.match(problems, /unknown layout "spiral"/);
  assert.match(problems, /needs a "studio" image/);
});

test('branded images replace supplier photos on every surface', () => {
  const supplier = {url: 'https://cdn.shopify.com/supplier.jpg'};
  const product = withCuratedImages({
    handle: nook.handle,
    title: 'Twilight Library — DIY Book Nook Kit',
    featuredImage: supplier,
    images: {nodes: [supplier, supplier]},
    galleryImages: {nodes: [supplier]},
    variants: {
      nodes: [
        {id: 'v1', image: supplier},
        {id: 'v2', image: null},
      ],
    },
    selectedOrFirstAvailableVariant: {id: 'v1', image: supplier},
  });
  const branded = curatedImages(nook.handle);
  assert.equal(product.featuredImage.url, branded[0].url);
  assert.deepEqual(product.images.nodes, branded);
  assert.deepEqual(product.galleryImages.nodes, branded);
  assert.equal(product.variants.nodes[0].image.url, branded[0].url);
  assert.equal(product.variants.nodes[1].image, null);
  assert.equal(
    product.selectedOrFirstAvailableVariant.image.url,
    branded[0].url,
  );
  assert.ok(
    branded.every((image) => image.width === 1000 && image.height === 1250),
  );
  assert.equal(curatedDisplayTitle(product), 'Twilight Library');

  const print = {handle: 'quiet-form-i-art-print', featuredImage: supplier};
  assert.equal(withCuratedImages(print), print);
  assert.equal(
    curatedDisplayTitle({
      handle: 'quiet-form-i-art-print',
      title: 'Quiet Form I',
    }),
    'Quiet Form I',
  );
});

test('themes appear only once a released nook uses them', () => {
  const draft = {
    ...nook,
    handle: 'draft-apothecary-nook',
    theme: 'magic',
    released: false,
  };
  const live = {...nook, handle: 'lantern-street-nook', theme: 'streets'};
  const inUse = bookNookThemesInUse([nook, draft, live]);
  assert.deepEqual(
    inUse.map((theme) => [theme.slug, theme.count]),
    [
      ['libraries', 1],
      ['streets', 1],
    ],
  );
  assert.equal(getBookNookTheme('magic')?.title, 'Magic & Myth');
  assert.equal(getBookNookTheme('nonsense'), null);
});

test('the shelf keeps registry order and skips kits the channel cannot see', () => {
  const second = {...nook, handle: 'second-nook'};
  const third = {...nook, handle: 'third-nook'};
  const shelf = buildBookNookShelf(
    [{handle: 'third-nook'}, {handle: nook.handle}],
    [nook, second, third],
  );
  assert.deepEqual(
    shelf.map(({nook: entry, number}) => [entry.handle, number]),
    [
      [nook.handle, 1],
      ['third-nook', 3],
    ],
  );
});

test('kit facts read the same on every card and product page', () => {
  assert.deepEqual(bookNookSpecRows(nook.specs), [
    {label: 'Pieces', value: '194'},
    {label: 'Build time', value: '2–3 hours'},
    {label: 'Age', value: '14+'},
    {label: 'Size', value: '12 × 10.5 × 17.5 cm'},
    {label: 'Light', value: 'Battery-powered, with a touch switch'},
  ]);
  assert.equal(bookNookFactLine(nook.specs), '194 pieces · 2–3 hours');
  assert.equal(
    bookNookFactLine({sizeCm: [16.5, 9.2, 22]}),
    '16.5 × 9.2 × 22 cm',
  );
  assert.equal(bookNookFactLine({}), '');
  assert.deepEqual(buildLevel({buildHours: [1, 2]}), {
    label: 'Quick build',
    time: '1–2 hours',
  });
  assert.equal(buildLevel({buildHours: [2, 3]})?.label, 'Evening build');
  assert.equal(buildLevel({buildHours: [5, 7]})?.label, 'Weekend build');
  assert.equal(buildLevel({buildHours: [10, 14]})?.label, 'Long project');
  assert.equal(buildLevel({buildHours: [1]})?.time, '1 hour');
  assert.equal(buildLevel({}), null);
  assert.deepEqual(bookNookSpecRows({pieces: 120}), [
    {label: 'Pieces', value: '120'},
  ]);
});

test('delivery promises name only countries every kit reaches', () => {
  assert.equal(formatDeliveryCountries(['CY', 'DE']), 'Cyprus and Germany');
  assert.equal(
    formatDeliveryCountries(['CY', 'DE', 'GR', 'CY']),
    'Cyprus, Germany and Greece',
  );
  assert.equal(formatDeliveryCountries(['DE']), 'Germany');
  assert.equal(formatDeliveryCountries([]), '');
  const germanyOnly = {
    ...nook,
    handle: 'germany-only-nook',
    verifiedDeliveryCountries: ['DE'],
  };
  assert.deepEqual(bookNookDeliveryCountries([nook]), ['CY', 'DE']);
  assert.deepEqual(bookNookDeliveryCountries([nook, germanyOnly]), ['DE']);
  assert.deepEqual(bookNookDeliveryCountries([]), []);
});

test('worldwide kits say so; verified lanes stay the fallback', () => {
  assert.equal(deliveryIncludedPhrase(['CY', 'DE']), 'to Cyprus and Germany');
  assert.equal(deliveryIncludedPhrase([]), '');
  assert.equal(
    deliveryIncludedPhrase(['CY', 'DE'], true),
    'worldwide, UK excepted',
  );
  const lanesOnly = {...nook, handle: 'lanes-only', deliversWorldwide: false};
  const worldwide = {...nook, deliversWorldwide: true};
  assert.equal(bookNookDeliveryPhrase([worldwide]), 'worldwide, UK excepted');
  // One kit still limited to its verified lanes limits the range promise.
  assert.equal(
    bookNookDeliveryPhrase([worldwide, lanesOnly]),
    'to Cyprus and Germany',
  );
  assert.equal(bookNookDeliveryPhrase([]), '');
  // Every live kit opened worldwide on 2026-10-06 (owner decision).
  assert.equal(bookNookDeliveryPhrase(), 'worldwide, UK excepted');
});
