import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPAREL_PRODUCT_TYPES,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  fulfilmentWindows,
  isApparelProductType,
  PRODUCTION_WINDOW_BUSINESS_DAYS,
} from '../app/lib/storefrontBasics.ts';

test('the four Quiet Current product types use the Printful windows', () => {
  for (const type of APPAREL_PRODUCT_TYPES) {
    assert.ok(isApparelProductType(type), type);
    assert.deepEqual(fulfilmentWindows(type), {
      production: '2–7',
      dispatch: '3–8',
    });
  }
  assert.ok(isApparelProductType('  yoga leggings '));
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
