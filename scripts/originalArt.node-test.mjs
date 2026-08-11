import assert from 'node:assert/strict';
import {
  buildOriginalArtProductMap,
  buildOriginalArtQuery,
  formatOriginalArtPrice,
  ORIGINAL_ART_HANDLES,
  ORIGINAL_ART_QUERY_FIRST,
  ORIGINAL_ART_TAG,
} from '../app/lib/originalArt.ts';

const fakeProduct = (handle, overrides = {}) => ({
  id: `gid://shopify/Product/${handle}`,
  handle,
  title: handle,
  vendor: 'Clara Mendes',
  productType: 'Art Prints',
  featuredImage: {url: `https://cdn.shopify.com/${handle}.webp`},
  priceRange: {
    minVariantPrice: {amount: '34.0', currencyCode: 'USD'},
    maxVariantPrice: {amount: '58.0', currencyCode: 'USD'},
  },
  cardVariant: {
    nodes: [
      {
        id: `gid://shopify/ProductVariant/${handle}`,
        availableForSale: true,
        price: {amount: '34.0', currencyCode: 'USD'},
        product: {handle, title: handle},
        selectedOptions: [],
        title: 'Default',
      },
    ],
  },
  // The production three-size shape: the released-price sample the card
  // fragment fetches alongside priceRange.
  sizeVariants: {
    nodes: [
      {availableForSale: true, price: {amount: '34.0', currencyCode: 'USD'}},
      {availableForSale: true, price: {amount: '46.0', currencyCode: 'USD'}},
      {availableForSale: true, price: {amount: '58.0', currencyCode: 'USD'}},
    ],
  },
  ...overrides,
});

// The catalog defines fifteen prints and the availability query must always
// cover all of them with headroom.
assert.equal(ORIGINAL_ART_HANDLES.length, 15);
assert.ok(
  ORIGINAL_ART_QUERY_FIRST >= ORIGINAL_ART_HANDLES.length,
  'availability query must cover the full expected catalog',
);

// The availability query filters by the sync-guaranteed catalog tag — tag
// is a supported product search field (handle is not; Shopify silently
// ignores it and would match the whole store).
assert.equal(buildOriginalArtQuery(), `tag:"${ORIGINAL_ART_TAG}"`);
assert.equal(ORIGINAL_ART_TAG, 'Clara Mendes Original');

// Regression: with more than 12 live products, every one of the fifteen —
// including the fifteenth — must be reported available. This guards against
// reintroducing a limited best-selling slice as the availability source.
const allLive = buildOriginalArtProductMap(
  ORIGINAL_ART_HANDLES.map((handle) => fakeProduct(handle)),
);
assert.equal(Object.keys(allLive).length, 15);

const fifteenth = allLive[ORIGINAL_ART_HANDLES[14]];
assert.ok(fifteenth, 'fifteenth product must not be marked unavailable');
assert.equal(fifteenth.availableForSale, true);
assert.equal(fifteenth.url, `/products/${ORIGINAL_ART_HANDLES[14]}`);
// The map price is the lowest RELEASED price and the range flag reflects
// the three live sizes, so the preview can render "From $34.00".
assert.deepEqual(fifteenth.price, {amount: '34.0', currencyCode: 'USD'});
assert.equal(fifteenth.hasPriceRange, true);

// Quiet Form I specifically — the print that regressed in production.
const quietFormI = allLive['quiet-form-i-art-print'];
assert.ok(quietFormI);
assert.equal(quietFormI.url, '/products/quiet-form-i-art-print');
assert.equal(formatOriginalArtPrice(quietFormI.price), '$34.00');

// A product Shopify does not return stays out of the map (renders as
// "Coming soon" with no invented price).
const missingOne = buildOriginalArtProductMap(
  ORIGINAL_ART_HANDLES.slice(0, 14).map((handle) => fakeProduct(handle)),
);
assert.equal(Object.keys(missingOne).length, 14);
assert.equal(missingOne[ORIGINAL_ART_HANDLES[14]], undefined);

// Off-theme vendors cannot masquerade as catalog prints.
const offTheme = buildOriginalArtProductMap([
  fakeProduct('quiet-form-i-art-print', {vendor: 'mock.shop'}),
]);
assert.equal(Object.keys(offTheme).length, 0);

// Sold-out variants stay linkable but are reported not available for sale.
const soldOut = buildOriginalArtProductMap([
  fakeProduct('quiet-form-ii-art-print', {
    cardVariant: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/x',
          availableForSale: false,
          price: {amount: '34.0', currencyCode: 'USD'},
          product: {handle: 'quiet-form-ii-art-print', title: 'x'},
          selectedOptions: [],
          title: 'Default',
        },
      ],
    },
  }),
]);
assert.equal(soldOut['quiet-form-ii-art-print'].availableForSale, false);

// GUARD REGRESSION: a staged-but-unreleased size (availableForSale=false at
// full price — how the size sync stages variants in Shopify) must neither
// set the card floor nor create a "From" range, even though it inflates
// priceRange.maxVariantPrice.
const stagedSize = buildOriginalArtProductMap([
  fakeProduct('quiet-form-iii-art-print', {
    sizeVariants: {
      nodes: [
        {availableForSale: true, price: {amount: '34.0', currencyCode: 'USD'}},
        {availableForSale: false, price: {amount: '58.0', currencyCode: 'USD'}},
      ],
    },
  }),
])['quiet-form-iii-art-print'];
assert.deepEqual(stagedSize.price, {amount: '34.0', currencyCode: 'USD'});
assert.equal(stagedSize.hasPriceRange, false);

// Products with no variant sample fall back to priceRange.minVariantPrice
// without inventing a range.
const noSample = buildOriginalArtProductMap([
  fakeProduct('quiet-form-i-art-print', {sizeVariants: undefined}),
])['quiet-form-i-art-print'];
assert.deepEqual(noSample.price, {amount: '34.0', currencyCode: 'USD'});
assert.equal(noSample.hasPriceRange, false);

// Price formatting matches the product page (Intl currency, 2 decimals).
assert.equal(
  formatOriginalArtPrice({amount: '34.0', currencyCode: 'USD'}),
  '$34.00',
);
assert.equal(formatOriginalArtPrice(null), null);
assert.equal(formatOriginalArtPrice({amount: 'oops', currencyCode: 'USD'}), null);
