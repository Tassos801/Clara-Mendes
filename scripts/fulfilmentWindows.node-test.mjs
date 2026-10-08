import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPAREL_PRODUCT_TYPES,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  fulfilmentWindows,
  isApparelProductType,
  PRODUCTION_WINDOW_BUSINESS_DAYS,
} from '../app/lib/storefrontBasics.ts';

test('only the four actual Quiet Current products use the verified Printful windows', () => {
  const handles = ['quiet-current-high-waist-leggings', 'quiet-current-studio-bra', 'quiet-current-high-waist-biker-shorts', 'quiet-current-studio-tank'];
  for (const [index, type] of APPAREL_PRODUCT_TYPES.entries()) {
    assert.ok(isApparelProductType(type), type);
    assert.deepEqual(fulfilmentWindows(type, handles[index]), {
      production: '2–7',
      dispatch: '3–8',
    });
  }
  assert.ok(isApparelProductType('  yoga leggings '));
});

test('future garments never inherit Quiet Current or Prodigi timing promises', () => {
  for (const type of [...APPAREL_PRODUCT_TYPES, 'Dresses', 'Jackets']) {
    assert.equal(fulfilmentWindows(type, 'future-garment'), null);
  }
  assert.equal(fulfilmentWindows('New Garment', 'new-garment', ['clara-mendes-clothing']), null);
});

test('every other product keeps the Prodigi windows', () => {
  for (const type of [
    'Art Prints',
    'Canvas Art',
    'Phone Cases',
    'Plant Pots',
    'Book Nooks',
    '',
    null,
    undefined,
  ]) {
    assert.equal(isApparelProductType(type), false, String(type));
    assert.deepEqual(fulfilmentWindows(type), {
      production: PRODUCTION_WINDOW_BUSINESS_DAYS,
      dispatch: DISPATCH_WINDOW_BUSINESS_DAYS,
    });
  }
});
