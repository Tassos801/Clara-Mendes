import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SKY_PRODUCT_HANDLE,
  SKY_SIZES,
  SKY_VARIANTS,
  skySizeFromOptions,
  skyVariantForSku,
} from '../app/lib/sky/products.ts';

test('six variants map to Prodigi SKUs with frame colour attributes', () => {
  assert.equal(SKY_PRODUCT_HANDLE, 'your-sky-star-map');
  assert.equal(Object.keys(SKY_VARIANTS).length, 6);
  assert.deepEqual(skyVariantForSku('CM-SKY-20X24-BLK'), {
    size: '20x24',
    finish: 'black',
    prodigiSku: 'GLOBAL-CFP-20X24',
    attributes: {color: 'black'},
  });
  assert.deepEqual(skyVariantForSku('cm-sky-8x10-unf '), {
    size: '8x10',
    finish: 'unframed',
    prodigiSku: 'GLOBAL-FAP-8X10',
    attributes: {},
  });
  assert.equal(skyVariantForSku('CM-PRINT-8X10'), null);
  assert.equal(skyVariantForSku(null), null);
  for (const [sku, variant] of Object.entries(SKY_VARIANTS)) {
    assert.ok(sku.includes(variant.size.toUpperCase()), `${sku} names its size`);
    assert.equal(
      variant.prodigiSku.startsWith('GLOBAL-CFP'),
      variant.finish !== 'unframed',
      `${sku} frame ↔ CFP`,
    );
  }
});

test('sizes carry points and pixels at 300 dpi', () => {
  assert.deepEqual(SKY_SIZES['8x10'].points, [576, 720]);
  assert.deepEqual(SKY_SIZES['20x24'].points, [1440, 1728]);
  assert.deepEqual(SKY_SIZES['20x24'].pixels, [6000, 7200]);
  assert.equal(skySizeFromOptions([{name: 'Size', value: '20 × 24 in'}]), '20x24');
  assert.equal(skySizeFromOptions([{name: 'Size', value: '8 × 10 in'}]), '8x10');
  assert.equal(skySizeFromOptions([{name: 'Size', value: 'nonsense'}]), '8x10');
  assert.equal(skySizeFromOptions(undefined), '8x10');
});
