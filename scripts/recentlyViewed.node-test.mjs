import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRecentlyViewed,
  isPriceRangeFlagFresh,
  PRICE_RANGE_FLAG_TTL_MS,
  RECENTLY_VIEWED_STORAGE_KEY,
  recordRecentlyViewed,
} from '../app/lib/recentlyViewed.ts';

function installLocalStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  return values;
}

test.afterEach(() => {
  delete globalThis.window;
});

test('ignores entries from the unversioned price snapshot cache', () => {
  installLocalStorage({
    'cm:recently-viewed': JSON.stringify([
      {
        amount: '29.00',
        currencyCode: 'EUR',
        handle: 'quiet-form-i-art-print',
        id: 'gid://shopify/Product/1',
        title: 'Quiet Form I',
        viewedAt: 1,
      },
    ]),
  });

  assert.equal(RECENTLY_VIEWED_STORAGE_KEY, 'cm:recently-viewed:v3');
  assert.deepEqual(getRecentlyViewed(), []);
});

test('ignores v2 entries whose amount was the selected variant price', () => {
  // A v2 snapshot taken while a shopper had the 20 × 24 selected holds
  // €49.99 — rendering that as a "From" floor would be wrong, so the v2
  // cache is orphaned exactly as v1 was for the 29.00→29.99 repricing.
  installLocalStorage({
    'cm:recently-viewed:v2': JSON.stringify([
      {
        amount: '49.99',
        currencyCode: 'EUR',
        handle: 'quiet-form-i-art-print',
        id: 'gid://shopify/Product/1',
        title: 'Quiet Form I',
        viewedAt: 1,
      },
    ]),
  });

  assert.deepEqual(getRecentlyViewed(), []);
});

test('ages out the price-range flag so a paused size cannot keep "From" alive', () => {
  const now = 1_700_000_000_000;
  const fresh = {hasPriceRange: true, viewedAt: now - 1000};
  const stale = {
    hasPriceRange: true,
    viewedAt: now - PRICE_RANGE_FLAG_TTL_MS - 1,
  };
  const flat = {hasPriceRange: false, viewedAt: now};

  assert.equal(isPriceRangeFlagFresh(fresh, now), true);
  assert.equal(isPriceRangeFlagFresh(stale, now), false);
  assert.equal(isPriceRangeFlagFresh(flat, now), false);
  assert.equal(
    isPriceRangeFlagFresh({hasPriceRange: undefined, viewedAt: now}, now),
    false,
  );
});

test('records and reads released-floor snapshots under the v3 key', () => {
  const values = installLocalStorage();
  recordRecentlyViewed({
    amount: '29.99',
    currencyCode: 'EUR',
    handle: 'quiet-form-i-art-print',
    hasPriceRange: true,
    id: 'gid://shopify/Product/1',
    title: 'Quiet Form I',
  });

  assert.equal(values.has('cm:recently-viewed'), false);
  assert.equal(values.has('cm:recently-viewed:v2'), false);
  assert.equal(values.has(RECENTLY_VIEWED_STORAGE_KEY), true);
  assert.deepEqual(
    getRecentlyViewed().map(({amount, handle, hasPriceRange}) => ({
      amount,
      handle,
      hasPriceRange,
    })),
    [{amount: '29.99', handle: 'quiet-form-i-art-print', hasPriceRange: true}],
  );
});
