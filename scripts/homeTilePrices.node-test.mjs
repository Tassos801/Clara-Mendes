import assert from 'node:assert/strict';
import test from 'node:test';
import {HERO_TILES} from '../app/content/brand.ts';
import {isDemoProduct} from '../app/lib/catalogFilters.ts';
import {
  HOME_TILE_PRICES_QUERY,
  homeTilePriceVariables,
  tilePriceLabels,
} from '../app/lib/homeTilePrices.ts';

const approved = {type: 'boolean', value: 'true'};
const money = (amount, currencyCode = 'EUR') => ({amount, currencyCode});
const variant = (amount, availableForSale = true, currencyCode = 'EUR') => ({
  availableForSale,
  price: money(amount, currencyCode),
});

/** A product the listing gate admits: a launch print, typed approvals. */
function product(overrides = {}) {
  return {
    handle: 'quiet-form-i-art-print',
    title: 'Quiet Form I',
    vendor: 'Clara Mendes',
    productType: 'Art Prints',
    tags: [],
    storefrontApproved: approved,
    fulfillmentVerified: approved,
    priceRange: {minVariantPrice: money('26.99')},
    sizeVariants: {
      nodes: [variant('26.99'), variant('35.99'), variant('44.99')],
    },
    ...overrides,
  };
}

const PRINT_HREF = HERO_TILES[0].href;
const CASE_HREF = HERO_TILES[2].href;

test('the query variables are the six tile handles in grid order', () => {
  assert.deepEqual(homeTilePriceVariables(), {
    tile0: 'quiet-form-i-art-print',
    tile1: 'the-great-wave-off-kanagawa-art-print',
    tile2: 'art-tough-phone-case',
    tile3: 'quiet-current-studio-tank',
    tile4: 'butter-sun-pastel-plant-pot',
    tile5: 'twilight-library-diy-book-nook-kit',
  });
});

test('the query is static, market-scoped and samples released variants', () => {
  assert.ok(HOME_TILE_PRICES_QUERY.startsWith('#graphql'));
  assert.match(HOME_TILE_PRICES_QUERY, /@inContext/);
  assert.match(HOME_TILE_PRICES_QUERY, /\$country/);
  assert.ok(HOME_TILE_PRICES_QUERY.includes('tile5: product(handle: $tile5)'));
  assert.ok(HOME_TILE_PRICES_QUERY.includes('variants(first: 10)'));
});

test('several released sizes read "From" the lowest; a staged cheaper size is ignored', () => {
  assert.equal(isDemoProduct(product()), false, 'the fixture passes the gate');
  assert.deepEqual(tilePriceLabels({tile0: product()}), {
    [PRINT_HREF]: 'From €26.99',
  });
  const staged = product({
    priceRange: {minVariantPrice: money('19.99')},
    sizeVariants: {
      nodes: [
        variant('19.99', false),
        variant('26.99'),
        variant('35.99'),
        variant('44.99'),
      ],
    },
  });
  assert.equal(tilePriceLabels({tile0: staged})[PRINT_HREF], 'From €26.99');
});

test('one purchasable price reads without "From"', () => {
  const phoneCase = product({
    handle: 'art-tough-phone-case',
    productType: 'Phone Cases',
    priceRange: {minVariantPrice: money('39.99')},
    sizeVariants: {nodes: Array.from({length: 10}, () => variant('39.99'))},
  });
  assert.deepEqual(tilePriceLabels({tile2: phoneCase}), {
    [CASE_HREF]: '€39.99',
  });
});

test('nothing purchasable means no chip, even with a priceRange', () => {
  const soldOut = product({
    sizeVariants: {
      nodes: [
        variant('26.99', false),
        variant('35.99', false),
        variant('44.99', false),
      ],
    },
  });
  assert.equal(soldOut.priceRange.minVariantPrice.amount, '26.99');
  assert.deepEqual(tilePriceLabels({tile0: soldOut}), {});
  assert.deepEqual(tilePriceLabels({tile0: product({sizeVariants: null})}), {});
});

test('a missing product or one the listing gate rejects gets no chip', () => {
  assert.deepEqual(tilePriceLabels({tile0: null, tile1: undefined}), {});
  for (const hidden of [
    product({handle: 'not-a-clara-mendes-product'}),
    product({vendor: 'mock.shop'}),
  ]) {
    assert.equal(isDemoProduct(hidden), true);
    assert.deepEqual(tilePriceLabels({tile0: hidden}), {});
  }
  const labels = tilePriceLabels({
    tile0: null,
    tile2: product({handle: 'art-tough-phone-case'}),
  });
  assert.deepEqual(Object.keys(labels), [CASE_HREF]);
});

test('the label follows the market currency', () => {
  const zloty = product({
    priceRange: {minVariantPrice: money('119.00', 'PLN')},
    sizeVariants: {
      nodes: [
        variant('119.00', true, 'PLN'),
        variant('159.00', true, 'PLN'),
        variant('199.00', true, 'PLN'),
      ],
    },
  });
  const label = tilePriceLabels({tile0: zloty})[PRINT_HREF];
  assert.match(label, /^From /);
  assert.match(label, /PLN|zł/);
  assert.match(label, /119\.00/);
});

test('no data, no chips; the result is frozen', () => {
  assert.deepEqual(tilePriceLabels(null), {});
  assert.deepEqual(tilePriceLabels(undefined), {});
  assert.ok(Object.isFrozen(tilePriceLabels({tile0: product()})));
});
