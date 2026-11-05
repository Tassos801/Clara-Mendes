import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ART_PRODUCT_FAMILIES,
  artProductPage,
  FAMILY_SPECS,
} from '../app/lib/artProductCatalog.ts';
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

// printful.com/fulfillment-updates (2026-10-20): Mugs and Sublimation 2–5 at
// every facility; All-over synthetic (cut-and-sew) 3–7 at partners. Each
// order then waits a business day for manual confirmation in Printful.
test('Printful museum products use Printful’s windows for their technique', () => {
  assert.deepEqual(fulfilmentWindows('Mugs', 'x-mug', [], 'sublimation'), {
    production: '2–5',
    dispatch: '3–6',
  });
  assert.deepEqual(fulfilmentWindows('Cushions', 'x-cushion', [], 'cut-sew'), {
    production: '2–7',
    dispatch: '3–8',
  });
  // The Prodigi mug family (Line and Colour) keeps Prodigi's windows.
  assert.deepEqual(fulfilmentWindows('Mugs', 'x-mug', [], null), {
    production: PRODUCTION_WINDOW_BUSINESS_DAYS,
    dispatch: DISPATCH_WINDOW_BUSINESS_DAYS,
  });
});

test('every Printful family names its technique, and only those do', () => {
  for (const family of ART_PRODUCT_FAMILIES) {
    const spec = FAMILY_SPECS[family];
    assert.equal(
      Boolean(spec.printfulTechnique),
      spec.route === 'printful',
      family,
    );
  }
  assert.equal(FAMILY_SPECS['printful-mug'].printfulTechnique, 'sublimation');
  assert.equal(FAMILY_SPECS.blanket.printfulTechnique, 'sublimation');
  assert.equal(FAMILY_SPECS.cushion.printfulTechnique, 'cut-sew');
  // The product page reads it from the shipped catalog.
  assert.equal(
    artProductPage('the-great-wave-off-kanagawa-mug')?.printfulTechnique,
    'sublimation',
  );
  assert.equal(
    artProductPage('the-great-wave-off-kanagawa-hanger-print')
      ?.printfulTechnique,
    null,
  );
});
