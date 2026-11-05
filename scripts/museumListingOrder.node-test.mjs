import assert from 'node:assert/strict';
import test from 'node:test';
import * as shops from '../app/lib/artistShops.ts';
import {ART_PRODUCT_CATALOG} from '../app/lib/artProductCatalog.ts';
import {
  compareListingOrder,
  featuredMuseumClause,
  museumListingRanks,
  museumSearchQuery,
  museumTagClause,
  sortMuseumProducts,
  studioSearchQuery,
} from '../app/lib/museumListingOrder.ts';
import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';

const FLOATING_WORLD = PRINT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
/** Great Wave … Sudden Shower, the catalog's artwork sequence. */
const SEQUENCE = [...FLOATING_WORLD.prints]
  .sort((a, b) => a.sequence - b.sequence)
  .map((print) => print.slug);
const FAMILIES = [
  'art-print',
  'framed-print',
  'canvas',
  'greeting-card',
  'postcard',
  'phone-case',
  'hanger-print',
  'acrylic-print',
  'metal-print',
  'mug',
  'cushion',
  'blanket',
];
/** Expected listing: every type in order, each in artwork sequence. */
const MUSEUM_ORDER = FAMILIES.flatMap((family) =>
  SEQUENCE.map((slug) => `${slug}-${family}`),
);

/**
 * Shopify lists newest first: the release created prints, then families.
 * Staged Drafts are never listed, so only released families are here.
 */
const NEWEST_FIRST = [
  ...SEQUENCE.map((slug) => `${slug}-art-print`),
  ...ART_PRODUCT_CATALOG.products
    .filter(
      (product) =>
        product.collection === FLOATING_WORLD.slug && product.released,
    )
    .map((product) => product.handle),
].reverse();
/** The catalog as it was with one museum collection. */
const FLOATING_WORLD_ONLY = {collections: [FLOATING_WORLD]};

const product = (handle) => ({handle});

test('the catalogs rank all 120 Floating World products, prints first', () => {
  const ranks = museumListingRanks();
  for (const handle of MUSEUM_ORDER) assert.ok(ranks.has(handle), handle);
  assert.ok(!ranks.has('quiet-form-i-art-print'));
  assert.ok(!ranks.has('art-tough-phone-case'));

  const sorted = sortMuseumProducts(NEWEST_FIRST.map(product)).map(
    (entry) => entry.handle,
  );
  assert.deepEqual(sorted, MUSEUM_ORDER);
  assert.equal(sorted[0], 'the-great-wave-off-kanagawa-art-print');
  assert.equal(
    sorted[9],
    'sudden-shower-over-shin-ohashi-bridge-and-atake-art-print',
  );
  assert.equal(sorted[10], 'the-great-wave-off-kanagawa-framed-print');
  assert.equal(
    sorted.at(-1),
    'sudden-shower-over-shin-ohashi-bridge-and-atake-blanket',
  );
  // Products the catalogs do not rank keep their order after the ranked.
  assert.deepEqual(
    sortMuseumProducts(
      ['b-unknown', 'yoshida-on-the-tokaido-canvas', 'a-unknown'].map(product),
    ).map((entry) => entry.handle),
    ['yoshida-on-the-tokaido-canvas', 'b-unknown', 'a-unknown'],
  );
});

test('museum products split the shop by the museum collection tags', () => {
  assert.equal(
    museumTagClause(),
    '(tag:"Floating World" OR tag:"Line and Colour")',
  );
  assert.equal(museumTagClause(FLOATING_WORLD_ONLY), '(tag:"Floating World")');
  assert.equal(
    studioSearchQuery(null, '(tag:"Floating World")'),
    'NOT (tag:"Floating World")',
  );
  assert.equal(
    studioSearchQuery('(product_type:"Phone Cases")', '(tag:"Floating World")'),
    '((product_type:"Phone Cases")) NOT (tag:"Floating World")',
  );
  assert.equal(
    museumSearchQuery('tag:"Floating World"', '(tag:"Floating World")'),
    '(tag:"Floating World") (tag:"Floating World")',
  );
  assert.equal(museumTagClause({collections: []}), null);
});

test('explicit sorts keep Shopify order; only Featured reorders', () => {
  assert.equal(
    featuredMuseumClause('featured', FLOATING_WORLD_ONLY),
    '(tag:"Floating World")',
  );
  for (const sort of ['price-asc', 'price-desc', 'alpha-asc', 'alpha-desc'])
    assert.equal(featuredMuseumClause(sort), null, sort);
});

test('compareListingOrder keeps other products first, in their order', () => {
  const list = [
    'yoshida-on-the-tokaido-phone-case',
    'studio-b',
    'the-great-wave-off-kanagawa-art-print',
    'studio-a',
    'hodogaya-on-the-tokaido-art-print',
  ];
  assert.deepEqual([...list].sort(compareListingOrder), [
    'studio-b',
    'studio-a',
    'the-great-wave-off-kanagawa-art-print',
    'hodogaya-on-the-tokaido-art-print',
    'yoshida-on-the-tokaido-phone-case',
  ]);
});

test('artist shops list museum works by type, then artwork sequence', () => {
  // What the shop can list: released products (Drafts never reach it).
  const hokusai = shops
    .artistProducts()
    .filter(
      (entry) => entry.artistId === 'katsushika-hokusai' && entry.released,
    );
  assert.ok(hokusai.length >= 6);
  const expected = MUSEUM_ORDER.filter((handle) =>
    hokusai.some((entry) => entry.handle === handle),
  );
  // Whatever order the products arrive in, Featured shows the same list.
  for (const input of [hokusai, [...hokusai].reverse()]) {
    const view = shops.artistShopView(input, new URLSearchParams());
    assert.equal(view.sort, 'featured');
    assert.deepEqual(
      view.products.map((entry) => entry.handle),
      expected,
    );
  }
  // An explicit sort is unchanged: title order, ties in the given order.
  const titles = shops
    .artistShopView([...hokusai].reverse(), new URLSearchParams('sort=title'))
    .products.map((entry) => entry.title);
  assert.deepEqual(
    titles,
    [...titles].sort((a, b) => a.localeCompare(b)),
  );
});
