import assert from 'node:assert/strict';
import test from 'node:test';

import {merchantFeedRows, merchantFeedTsv} from '../app/lib/merchantFeed.ts';
import {productSchema} from '../app/lib/seo.ts';
import {SHIPPING_COUNTRY_CODES} from '../app/lib/storefrontBasics.ts';

// Products shaped like the Storefront reads the PDP and the feeds share.
let next = 0;
const variant = (sku, options, amount) => ({
  id: `gid://shopify/ProductVariant/${++next}`,
  sku,
  availableForSale: true,
  barcode: null,
  title: Object.values(options).join(' / '),
  price: {amount, currencyCode: 'EUR'},
  selectedOptions: Object.entries(options).map(([name, value]) => ({
    name,
    value,
  })),
  image: {url: `https://cdn.example/${sku}.jpg`},
});
const product = (handle, productType, tags, variants) => ({
  handle,
  title: handle,
  productType,
  tags,
  description: 'Copy.',
  featuredImage: {url: `https://cdn.example/${handle}.jpg`},
  variants: {nodes: variants},
});

const MUSEUM = ['Museum Reproduction', 'Katsushika Hokusai'];
const PRODUCTS = [
  product('the-great-wave-off-kanagawa-art-print', 'Art Prints', MUSEUM, [
    variant('CM-FW-01-8X10', {Size: '8 × 10 in'}, '26.99'),
    variant('CM-FW-01-20X24', {Size: '20 × 24 in'}, '44.99'),
  ]),
  product(
    'the-great-wave-off-kanagawa-acrylic-print',
    'Acrylic Prints',
    MUSEUM,
    [variant('CM-FW-01-ACRY8X12', {Size: '8 × 12 in'}, '89.99')],
  ),
  product('the-great-wave-off-kanagawa-canvas', 'Canvas Art', MUSEUM, [
    variant('CM-FW-01-CAN16X20', {Size: '16 × 20 in'}, '69.99'),
  ]),
  product('the-great-wave-off-kanagawa-greeting-card', 'Cards', MUSEUM, [
    variant('CM-FW-01-CARD', {Size: '5 × 7 in'}, '6.99'),
  ]),
  product(
    'your-sky-star-map',
    'Personalised Art',
    [],
    [
      variant('CM-SKY-1', {Size: '8 × 10 in', Finish: 'Unframed'}, '39.99'),
      variant(
        'CM-SKY-2',
        {Size: '20 × 24 in', Finish: 'Natural frame'},
        '129.99',
      ),
    ],
  ),
];
const BLANKET = product(
  'the-great-wave-off-kanagawa-blanket',
  'Blankets',
  MUSEUM,
  [variant('CM-FW-01-BLANKET50X60-PF', {Size: '50 × 60 in'}, '64.99')],
);

/** country -> "rate EUR" for each SKU, read from the EUR feed's shipping cells. */
function feedRates(products) {
  const tsv = merchantFeedTsv(merchantFeedRows(products, 'fixed'));
  const rates = new Map();
  for (const line of tsv.trim().split('\n').slice(1)) {
    const [id, ...rest] = line.split('\t');
    const cells = rest.filter((cell) => /^[A-Z]{2}:[\d.]+ EUR:/.test(cell));
    rates.set(
      id,
      new Map(
        cells.map((cell) => {
          const [country, price] = cell.split(':');
          return [country, price];
        }),
      ),
    );
  }
  return rates;
}

function schemaFor(p, market = null) {
  return productSchema({
    description: 'Copy.',
    market,
    productHandle: p.handle,
    productId: 'gid://shopify/Product/1',
    productType: p.productType,
    tags: p.tags,
    title: p.title,
    url: `https://shopclaramendes.com/products/${p.handle}`,
    variants: p.variants.nodes,
  });
}

/** sku -> country -> "rate EUR" from the JSON-LD offers. */
function schemaRates(schema, skus) {
  const offers = schema.hasVariant
    ? schema.hasVariant.map((entry) => entry.offers)
    : [schema.offers];
  const rates = new Map();
  offers.forEach((offer, index) => {
    const blocks = [offer.shippingDetails].flat().filter(Boolean);
    const byCountry = new Map();
    for (const block of blocks) {
      if (!block.shippingRate) continue;
      assert.equal(block['@type'], 'OfferShippingDetails');
      assert.equal(block.shippingRate['@type'], 'MonetaryAmount');
      for (const region of block.shippingDestination)
        byCountry.set(
          region.addressCountry,
          `${block.shippingRate.value} ${block.shippingRate.currency}`,
        );
    }
    rates.set(skus[index], byCountry);
  });
  return rates;
}

test('JSON-LD shippingRate equals the Merchant Center feed rate per product and country', () => {
  const feed = feedRates(PRODUCTS);
  let compared = 0;
  for (const p of PRODUCTS) {
    const skus = p.variants.nodes.map((v) => v.sku);
    const schema = schemaRates(schemaFor(p), skus);
    for (const sku of skus) {
      const pageRates = schema.get(sku);
      const feedRow = feed.get(sku);
      assert.ok(feedRow, `${sku} not in the feed`);
      assert.equal(pageRates.size, SHIPPING_COUNTRY_CODES.length, sku);
      for (const [country, rate] of pageRates) {
        // Slovenia is in the EU-27 but not a Google Shopping country.
        if (!feedRow.has(country)) {
          assert.equal(country, 'SI');
          continue;
        }
        assert.equal(rate, feedRow.get(country), `${sku} ${country}`);
        compared += 1;
      }
    }
  }
  assert.ok(compared > 150);
});

test('Cyprus and the rest of the EU are separate shipping blocks', () => {
  const schema = schemaFor(PRODUCTS[2]);
  const blocks = [schema.offers.shippingDetails].flat();
  assert.equal(blocks.length, 2);
  const cyprus = blocks.find((b) =>
    b.shippingDestination.some((r) => r.addressCountry === 'CY'),
  );
  const rest = blocks.find((b) => b !== cyprus);
  assert.deepEqual(cyprus.shippingRate, {
    '@type': 'MonetaryAmount',
    value: '3.99',
    currency: 'EUR',
  });
  assert.deepEqual(
    cyprus.shippingDestination.map((r) => r.addressCountry),
    ['CY'],
  );
  assert.equal(rest.shippingRate.value, '16.00');
  assert.equal(rest.shippingDestination.length, 26);
  // Cards pay one EU-wide rate: one block.
  const card = schemaFor(PRODUCTS[3]).offers.shippingDetails;
  assert.equal(card.shippingRate.value, '2.90');
  assert.equal(card.shippingDestination.length, 27);
});

test('no static rate, no shippingRate: Printful lines and the US market', () => {
  const blanket = schemaFor(BLANKET).offers.shippingDetails;
  assert.equal(blanket['@type'], 'OfferShippingDetails');
  assert.equal(blanket.shippingRate, undefined);
  assert.ok(blanket.deliveryTime);
  const us = schemaFor(PRODUCTS[2], 'US').offers.shippingDetails;
  assert.equal(us.shippingRate, undefined);
  assert.deepEqual(
    us.shippingDestination.map((r) => r.addressCountry),
    ['US'],
  );
});

test('the JSON-LD survives a JSON round trip with schema.org types only', () => {
  const schema = JSON.parse(JSON.stringify(schemaFor(PRODUCTS[0])));
  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'ProductGroup');
  for (const entry of schema.hasVariant) {
    assert.equal(entry['@type'], 'Product');
    assert.equal(entry.offers['@type'], 'Offer');
    for (const block of [entry.offers.shippingDetails].flat()) {
      assert.equal(block.deliveryTime['@type'], 'ShippingDeliveryTime');
      assert.equal(
        block.deliveryTime.handlingTime['@type'],
        'QuantitativeValue',
      );
      assert.match(block.shippingRate.value, /^\d+\.\d{2}$/);
    }
  }
});
