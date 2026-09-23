import assert from 'node:assert/strict';
import test from 'node:test';

import {productSchema} from '../app/lib/seo.ts';

const variant = (id, size, amount, availableForSale = true) => ({
  availableForSale,
  id: `gid://shopify/ProductVariant/${id}`,
  price: {amount, currencyCode: 'EUR'},
  selectedOptions: [
    {name: 'Size', value: size},
    {name: 'Finish', value: 'Unframed'},
  ],
  sku: `CM-SC-01-${id}`,
  title: `${size} / Unframed`,
});

const base = {
  description: 'An orbital ring over a pale planet.',
  productId: 'gid://shopify/Product/16078105313614',
  title: 'Orbital Silence Art Print',
  url: 'https://shopclaramendes.com/products/orbital-silence-art-print',
  vendor: 'Clara Mendes',
};

test('a multi-size print is a ProductGroup with per-variant offer URLs', () => {
  const schema = productSchema({
    ...base,
    variants: [
      variant(1, '8 × 10 in', '29.99'),
      variant(2, '16 × 20 in', '39.99'),
      variant(3, '20 × 24 in', '49.99'),
    ],
  });
  assert.equal(schema['@type'], 'ProductGroup');
  assert.equal(schema.productGroupID, '16078105313614');
  assert.deepEqual(schema.variesBy, ['https://schema.org/size']);
  assert.equal(schema.hasVariant.length, 3);
  assert.equal(schema.hasVariant[1].size, '16 × 20 in');
  const offerUrl = new URL(schema.hasVariant[1].offers.url);
  assert.equal(offerUrl.searchParams.get('Size'), '16 × 20 in');
  assert.equal(offerUrl.searchParams.get('Finish'), 'Unframed');
  assert.equal(schema.offers.lowPrice, '29.99');
  assert.equal(schema.offers.highPrice, '49.99');
});

test('staged sizes stay out; one offered size is a plain Product', () => {
  const schema = productSchema({
    ...base,
    variants: [
      variant(1, '8 × 10 in', '29.99'),
      variant(2, '16 × 20 in', '39.99', false),
    ],
  });
  assert.equal(schema['@type'], 'Product');
  assert.equal(schema.hasVariant, undefined);
  assert.equal(schema.productGroupID, undefined);
  assert.equal(schema.offers.price, '29.99');
});
