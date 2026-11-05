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

test('offer handling time follows the exact released product dispatch window', () => {
  const handling = (productType, productHandle) =>
    productSchema({
      ...base,
      productType,
      productHandle,
      variants: [variant(1, '8 × 10 in', '29.99')],
    }).offers.shippingDetails.deliveryTime;

  const print = handling('Art Prints');
  assert.deepEqual(
    [print.handlingTime.minValue, print.handlingTime.maxValue],
    [2, 4],
  );
  assert.deepEqual(
    [print.transitTime.minValue, print.transitTime.maxValue],
    [5, 10],
  );

  const leggings = handling('Yoga Leggings', 'quiet-current-high-waist-leggings');
  assert.deepEqual(
    [leggings.handlingTime.minValue, leggings.handlingTime.maxValue],
    [3, 8],
  );
  assert.deepEqual(
    [leggings.transitTime.minValue, leggings.transitTime.maxValue],
    [5, 10],
  );
});

test('Printful museum products carry Printful’s window, not Prodigi’s', () => {
  const handling = (printfulTechnique) => {
    const schema = productSchema({
      ...base,
      productType: 'Cushions',
      productHandle: 'the-great-wave-off-kanagawa-cushion',
      printfulTechnique,
      variants: [variant(1, '18 × 18 in', '44.99'), variant(2, '22 × 22 in', '49.99')],
    });
    return [schema.offers, ...schema.hasVariant.map((node) => node.offers)]
      .map((offer) => offer.shippingDetails?.deliveryTime.handlingTime)
      .filter(Boolean)
      .map((time) => [time.minValue, time.maxValue]);
  };
  assert.deepEqual(handling('cut-sew'), [[3, 8], [3, 8]]);
  assert.deepEqual(handling('sublimation'), [[3, 6], [3, 6]]);
  assert.deepEqual(handling(undefined), [[2, 4], [2, 4]]);
});

test('every variant offer of a garment carries the Printful window', () => {
  const schema = productSchema({
    ...base,
    productType: 'Sports Bra',
    productHandle: 'quiet-current-studio-bra',
    variants: [variant(1, 'S', '69.00'), variant(2, 'M', '69.00')],
  });
  for (const node of schema.hasVariant) {
    const {handlingTime} = node.offers.shippingDetails.deliveryTime;
    assert.deepEqual([handlingTime.minValue, handlingTime.maxValue], [3, 8]);
  }
});

test('future garment product and variant offers omit unsupported shipping promises', () => {
  for (const fields of [
    {productType: 'Dresses'},
    {productType: 'Sports Bra'},
    {productType: 'New garment', tags: ['clara-mendes-clothing']},
  ]) {
    const schema = productSchema({...base, ...fields, productHandle: 'future-garment', variants: [variant(1, 'S', '69.00'), variant(2, 'M', '69.00')]});
    assert.equal(schema.offers.shippingDetails, undefined);
    for (const node of schema.hasVariant) assert.equal(node.offers.shippingDetails, undefined);
  }
});

test('personalised offers permit no returns; prints keep the 30-day window', () => {
  const policies = (productType, variants) => {
    const schema = productSchema({...base, productType, variants});
    return schema.hasVariant
      ? schema.hasVariant.map((node) => node.offers.hasMerchantReturnPolicy)
      : [schema.offers.hasMerchantReturnPolicy];
  };
  const one = [variant(1, '8 × 10 in', '35.99')];
  const two = [...one, variant(2, '20 × 24 in', '59.99')];

  for (const variants of [one, two]) {
    for (const policy of policies('Personalised Art', variants)) {
      assert.equal(
        policy.returnPolicyCategory,
        'https://schema.org/MerchantReturnNotPermitted',
      );
      assert.equal(policy.merchantReturnDays, undefined);
      assert.equal(policy.returnFees, undefined);
      assert.equal(policy.applicableCountry.length, 27);
    }
    for (const policy of policies('Art Prints', variants)) {
      assert.equal(
        policy.returnPolicyCategory,
        'https://schema.org/MerchantReturnFiniteReturnWindow',
      );
      assert.equal(policy.merchantReturnDays, 30);
    }
  }
});
