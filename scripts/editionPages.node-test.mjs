import assert from 'node:assert/strict';
import {ART_PRODUCT_CATALOG} from '../app/lib/artProductCatalog.ts';
import {
  editionPageForProduct,
  editionPagePath,
  editionTagQuery,
  getEditionPage,
  listEditionPages,
} from '../app/lib/editionPages.ts';
import {CUSTOM_SITEMAP_PATHS} from '../app/lib/sitemap.ts';

// Fixture catalogs: one edition collection, one plain museum collection.
const catalog = {
  collections: [
    {slug: 'art-and-words', title: 'Art & Words', edition: 'art-and-words', prints: []},
    {slug: 'floating-world', title: 'Floating World', kind: 'museum', prints: []},
  ],
};
const product = (handle, collection, released) => ({
  handle,
  collection,
  released,
  artworkId: 'x',
  family: 'blanket',
});
const artProducts = {
  collections: [],
  products: [
    product('b-quote-blanket', 'art-and-words', true),
    product('a-quote-blanket', 'art-and-words', false),
    product('c-quote-blanket', 'art-and-words', true),
    product('wave-blanket', 'floating-world', true),
  ],
};
const sources = {artProducts, catalog};

// Released products only, in catalog order; unreleased ones never show.
const page = getEditionPage('art-and-words', sources);
assert.deepEqual(page.handles, ['b-quote-blanket', 'c-quote-blanket']);
assert.equal(page.title, 'Art & Words');
assert.equal(getEditionPage(' Art-And-Words ', sources)?.slug, 'art-and-words');

// A newly released design appears without a code edit.
artProducts.products[1].released = true;
assert.deepEqual(getEditionPage('art-and-words', sources).handles, [
  'b-quote-blanket',
  'a-quote-blanket',
  'c-quote-blanket',
]);

// No page without a released product, for a plain museum collection
// (sold through /artists), or for an unknown slug.
const unreleased = {
  artProducts: {
    collections: [],
    products: artProducts.products.map((entry) => ({...entry, released: false})),
  },
  catalog,
};
assert.equal(getEditionPage('art-and-words', unreleased), null);
assert.deepEqual(listEditionPages(unreleased), []);
assert.equal(getEditionPage('floating-world', sources), null);
assert.equal(getEditionPage('museum-masterpieces', sources), null);
assert.equal(getEditionPage(null, sources), null);
// A collection that is not an edition never gets a page, even with copy.
const plain = {
  artProducts,
  catalog: {collections: [{...catalog.collections[0], edition: undefined}]},
};
assert.equal(getEditionPage('art-and-words', plain), null);

// Edition detection for a product page: released edition products only.
assert.equal(editionPageForProduct('c-quote-blanket', sources)?.slug, 'art-and-words');
assert.equal(editionPageForProduct('wave-blanket', sources), null);
assert.equal(editionPageForProduct('unknown', sources), null);
const staged = {
  artProducts: {
    collections: [],
    products: [
      product('b-quote-blanket', 'art-and-words', true),
      product('d-quote-blanket', 'art-and-words', false),
    ],
  },
  catalog,
};
assert.equal(editionPageForProduct('d-quote-blanket', staged), null);

assert.equal(editionTagQuery({title: 'Art & Words'}), 'tag:"Art & Words"');
assert.equal(editionPagePath('art-and-words'), '/collections/art-and-words');

// The real catalog: the page lists exactly the released quote blankets.
const live = getEditionPage('art-and-words');
assert.ok(live, 'Art & Words has released products');
assert.deepEqual(
  live.handles,
  ART_PRODUCT_CATALOG.products
    .filter((entry) => entry.collection === 'art-and-words' && entry.released)
    .map((entry) => entry.handle),
);
assert.ok(live.handles.every((handle) => handle.endsWith('-quote-blanket')));
assert.ok(CUSTOM_SITEMAP_PATHS.includes('/collections/art-and-words'));
assert.equal(
  editionPageForProduct('the-great-wave-off-kanagawa-quote-blanket')?.slug,
  'art-and-words',
);

// SERP budget, as for the capsule pages: buildSeoMeta appends the brand.
assert.ok(live.seoTitle.length <= 47, live.seoTitle);
assert.ok(
  live.metaDescription.length >= 120 && live.metaDescription.length <= 155,
  `metaDescription is ${live.metaDescription.length} chars`,
);

console.log('editionPages tests passed');
