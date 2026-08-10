import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_SIZE,
  LARGE_SIZE,
  expectedSku,
  inspectOriginalArtProduct,
  largeAssetFileName,
  multiSizeDescription,
  normalizePrice,
  releaseState,
} from './lib/original-art-size-plan.mjs';

const item = {
  image: '/images/product-art/quiet-form/quiet-form-01.webp',
  skuPrefix: 'CM-QF-01',
};

function variant({
  availableForSale,
  inventoryQuantity = 0,
  label,
  price,
  sku,
  tracked,
}) {
  return {
    availableForSale,
    inventoryItem: {requiresShipping: true, sku, tracked},
    inventoryPolicy: 'DENY',
    inventoryQuantity,
    price,
    selectedOptions: [{name: 'Size', value: label}],
    sku,
  };
}

function product(variants) {
  return {
    options: [{name: 'Size', optionValues: []}],
    status: 'ACTIVE',
    variants: {nodes: variants},
  };
}

test('normalizes explicit prices and rejects invalid values', () => {
  assert.equal(normalizePrice('49'), '49.00');
  assert.equal(normalizePrice('49.5'), '49.50');
  assert.throws(() => normalizePrice('free'), /Invalid price/);
  assert.throws(() => normalizePrice('0'), /greater than zero/);
});

test('derives deterministic SKU and asset names', () => {
  assert.equal(BASE_SIZE.legacyPrice, '29.00');
  assert.equal(BASE_SIZE.price, '29.99');
  assert.equal(LARGE_SIZE.price, '39.99');
  assert.equal(LARGE_SIZE.prodigiSku, 'ART-FAP-EMA-16X20');
  assert.equal(expectedSku(item), 'CM-QF-01-16X20');
  assert.equal(expectedSku(item, BASE_SIZE), 'CM-QF-01-8X10');
  assert.equal(largeAssetFileName(item), 'quiet-form-01-16x20-300dpi.jpg');
});

test('allows the legacy base price only for the guarded transition preflight', () => {
  const base = variant({
    availableForSale: true,
    label: '8 × 10 in',
    price: '29.00',
    sku: 'CM-QF-01-8X10',
    tracked: false,
  });
  const transitionInspection = inspectOriginalArtProduct(
    product([base]),
    item,
    {allowLegacyBasePrice: true},
  );
  const strictInspection = inspectOriginalArtProduct(product([base]), item);

  assert.deepEqual(transitionInspection.issues, []);
  assert.match(strictInspection.issues.join('\n'), /expected 29\.99/);
  assert.equal(releaseState(transitionInspection.largeVariant), 'MISSING');
});

test('distinguishes a staged larger variant from an active one', () => {
  const staged = variant({
    availableForSale: false,
    label: '16 × 20 in',
    price: '39.99',
    sku: 'CM-QF-01-16X20',
    tracked: true,
  });
  const active = {...staged, availableForSale: true};
  active.inventoryItem = {...staged.inventoryItem, tracked: false};

  assert.equal(releaseState(staged), 'STAGED');
  assert.equal(releaseState(active), 'ACTIVE');
});

test('rejects a tracked large variant unless it is unavailable at zero stock', () => {
  const availableWhileTracked = variant({
    availableForSale: true,
    label: LARGE_SIZE.label,
    price: LARGE_SIZE.price,
    sku: 'CM-QF-01-16X20',
    tracked: true,
  });
  const stockedWhileTracked = variant({
    ...availableWhileTracked,
    availableForSale: false,
    inventoryQuantity: 1,
  });

  assert.equal(releaseState(availableWhileTracked), 'INVALID');
  assert.equal(releaseState(stockedWhileTracked), 'INVALID');
});

test('updates the fixed-size description once', () => {
  const current = '<ul><li>Unframed 8 × 10 inch portrait print</li></ul>';
  const first = multiSizeDescription(current);
  const second = multiSizeDescription(first.html);

  assert.equal(first.changed, true);
  assert.match(first.html, /8 × 10 and 16 × 20 inch sizes/);
  assert.equal(second.changed, false);
});
