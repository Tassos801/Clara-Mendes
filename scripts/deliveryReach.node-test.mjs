import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countryPhrase,
  defaultMarketVariants,
  markNotShippedTo,
  markOutOfReachVariants,
  needsVariantReach,
  nothingBuyable,
  reachCheckIds,
} from '../app/lib/deliveryReach.ts';
import {
  deliveryCountryChoices,
  withDeliveryReach,
  withVariantReach,
} from '../app/lib/deliveryReach.server.ts';
import {marketCountryName} from '../app/lib/markets.ts';
import {productSchema} from '../app/lib/seo.ts';
import {describeOptionValues} from '../app/lib/variantOptions.ts';

const product = (id, ...flags) => ({
  id: `gid://shopify/Product/${id}`,
  sizeVariants: {nodes: flags.map((availableForSale) => ({availableForSale}))},
});
const variant = (id, availableForSale) => ({
  availableForSale,
  id: `gid://shopify/ProductVariant/${id}`,
  price: {amount: '7.20', currencyCode: 'EUR'},
  selectedOptions: [{name: 'Artwork', value: `Artwork ${id}`}],
  title: `Artwork ${id}`,
});

/** A Storefront stand-in that records each query and answers per query. */
function fakeStorefront(country, answer) {
  const calls = [];
  return {
    calls,
    i18n: {country, language: 'EN'},
    CacheLong: () => 'long',
    async query(document, options = {}) {
      calls.push({document, ...options});
      return answer(document, options);
    },
  };
}

test('country names read as sentence objects', () => {
  assert.equal(marketCountryName('us'), 'United States');
  assert.equal(marketCountryName('ZZ'), null);
  assert.equal(countryPhrase('US'), 'the United States');
  assert.equal(countryPhrase('NL'), 'the Netherlands');
  assert.equal(countryPhrase('JP'), 'Japan');
  assert.equal(countryPhrase('CA'), 'Canada');
});

test('a listing entry is unbuyable only when no sampled variant is', () => {
  assert.equal(nothingBuyable(product(1, false, false)), true);
  assert.equal(nothingBuyable(product(2, false, true)), false);
  // No variant data says nothing about reach.
  assert.equal(nothingBuyable(product(3)), false);
  // A product-level flag wins over the sample (Pastel Forms, book nooks).
  assert.equal(
    nothingBuyable({...product(4, true), availableForSale: false}),
    true,
  );
});

test('only a buyer outside the default market triggers a reach check', () => {
  const listing = [product(1, false), product(2, true), product(1, false)];
  assert.deepEqual(reachCheckIds('CY', listing), []);
  assert.deepEqual(reachCheckIds('US', listing), ['gid://shopify/Product/1']);
});

test('only unbuyable products the default market sells are labelled', () => {
  const card = product(1, false);
  const soldOut = product(2, false);
  const buyable = product(3, true);
  const marked = markNotShippedTo(
    [card, soldOut, buyable],
    new Set([card.id, buyable.id]),
    'US',
  );
  assert.equal(marked[0].notShippedTo, 'the United States');
  assert.equal(marked[1].notShippedTo, undefined);
  assert.equal(marked[2].notShippedTo, undefined);
});

test('variants: out of reach means sellable in the default market only', () => {
  const variants = [variant(1, false), variant(2, false), variant(3, true)];
  assert.equal(needsVariantReach('CY', variants), false);
  assert.equal(needsVariantReach('US', [variant(3, true)]), false);
  assert.equal(needsVariantReach('US', variants), true);

  const marked = markOutOfReachVariants(
    variants,
    new Set([variants[0].id, variants[2].id]),
  );
  assert.equal(marked[0].outOfReach, true);
  // Unavailable in the default market too: genuinely sold out or staged.
  assert.equal(marked[1].outOfReach, undefined);
  assert.equal(marked[2].outOfReach, undefined);

  const asDefault = defaultMarketVariants(marked);
  assert.deepEqual(
    asDefault.map((entry) => entry.availableForSale),
    [true, false, true],
  );
});

test('an out-of-reach option value is not a sold-out one', () => {
  const variants = markOutOfReachVariants(
    [variant(1, false), variant(2, false)],
    new Set([variant(1, false).id]),
  );
  const {values} = describeOptionValues({
    option: {
      name: 'Artwork',
      optionValues: [{name: 'Artwork 1'}, {name: 'Artwork 2'}],
    },
    selectedMap: new Map(),
    variants,
  });
  assert.deepEqual(
    values.map((value) => [value.name, value.available, value.outOfReach]),
    [
      ['Artwork 1', false, true],
      ['Artwork 2', false, false],
    ],
  );
});

test('structured data reads an out-of-reach card as in stock', () => {
  const variants = markOutOfReachVariants(
    [variant(1, false)],
    new Set([variant(1, false).id]),
  );
  const schema = productSchema({
    availableForSale: true,
    description: 'A folded fine-art card.',
    title: 'Nissaka Greeting Card',
    url: 'https://shopclaramendes.com/products/nissaka-greeting-card',
    variants: defaultMarketVariants(variants),
  });
  assert.equal(schema.offers.availability, 'https://schema.org/InStock');

  const soldOut = productSchema({
    availableForSale: false,
    description: 'A folded fine-art card.',
    priceRange: {minVariantPrice: {amount: '7.20', currencyCode: 'EUR'}},
    title: 'Nissaka Greeting Card',
    url: 'https://shopclaramendes.com/products/nissaka-greeting-card',
    variants: defaultMarketVariants([variant(1, false)]),
  });
  assert.equal(soldOut.offers.availability, 'https://schema.org/OutOfStock');
});

test('withDeliveryReach makes one default-market read per listing', async () => {
  const card = product(1, false);
  const soldOut = product(2, false);
  const buyable = product(3, true);
  const storefront = fakeStorefront('US', () => ({
    nodes: [
      {__typename: 'Product', availableForSale: true, id: card.id},
      {__typename: 'Product', availableForSale: false, id: soldOut.id},
    ],
  }));
  const marked = await withDeliveryReach(storefront, [card, soldOut, buyable]);

  assert.equal(storefront.calls.length, 1);
  assert.match(storefront.calls[0].document, /@inContext\(country: \$country/);
  assert.deepEqual(storefront.calls[0].variables, {
    country: 'CY',
    ids: [card.id, soldOut.id],
  });
  assert.deepEqual(
    marked.map((entry) => entry.notShippedTo),
    ['the United States', undefined, undefined],
  );
});

test('withDeliveryReach skips the read when nothing needs it', async () => {
  const listing = [product(1, false)];
  const cyprus = fakeStorefront('CY', () => assert.fail('no query'));
  assert.equal(await withDeliveryReach(cyprus, listing), listing);

  const allBuyable = [product(2, true)];
  const us = fakeStorefront('US', () => assert.fail('no query'));
  assert.equal(await withDeliveryReach(us, allBuyable), allBuyable);
});

test('a failed default-market read keeps the sold-out state', async () => {
  const listing = [product(1, false)];
  const storefront = fakeStorefront('US', () => {
    throw new Error('offline');
  });
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await withDeliveryReach(storefront, listing), listing);
  } finally {
    console.warn = warn;
  }
});

test('withVariantReach flags the selected and listed variants', async () => {
  const variants = [variant(1, false), variant(2, false)];
  const page = {
    handle: 'fine-art-greeting-card',
    selectedOrFirstAvailableVariant: variants[0],
    variants: {nodes: variants},
  };
  const storefront = fakeStorefront('US', () => ({
    product: {
      variants: {
        nodes: [
          {availableForSale: true, id: variants[0].id},
          {availableForSale: false, id: variants[1].id},
        ],
      },
    },
  }));
  const reached = await withVariantReach(storefront, page);

  assert.deepEqual(storefront.calls[0].variables, {
    country: 'CY',
    handle: 'fine-art-greeting-card',
  });
  assert.equal(reached.selectedOrFirstAvailableVariant.outOfReach, true);
  assert.deepEqual(
    reached.variants.nodes.map((entry) => entry.outOfReach),
    [true, undefined],
  );

  const cyprus = fakeStorefront('CY', () => assert.fail('no query'));
  assert.equal(await withVariantReach(cyprus, page), page);
});

test('delivery choices are the checkout countries, sorted by name', async () => {
  const storefront = fakeStorefront('US', () => ({
    localization: {
      availableCountries: [
        {isoCode: 'US'},
        {isoCode: 'CY'},
        {isoCode: 'AT'},
        {isoCode: 'ZZ'},
      ],
    },
  }));
  assert.deepEqual(await deliveryCountryChoices(storefront), [
    {code: 'AT', name: 'Austria'},
    {code: 'CY', name: 'Cyprus'},
    {code: 'US', name: 'United States'},
  ]);
  assert.equal(storefront.calls[0].cache, 'long');
});
