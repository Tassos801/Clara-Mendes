import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRecentlyViewed,
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

  assert.equal(RECENTLY_VIEWED_STORAGE_KEY, 'cm:recently-viewed:v2');
  assert.deepEqual(getRecentlyViewed(), []);
});

test('records and reads current product snapshots under the v2 key', () => {
  const values = installLocalStorage();
  recordRecentlyViewed({
    amount: '29.99',
    currencyCode: 'EUR',
    handle: 'quiet-form-i-art-print',
    id: 'gid://shopify/Product/1',
    title: 'Quiet Form I',
  });

  assert.equal(values.has('cm:recently-viewed'), false);
  assert.equal(values.has(RECENTLY_VIEWED_STORAGE_KEY), true);
  assert.deepEqual(
    getRecentlyViewed().map(({amount, handle}) => ({amount, handle})),
    [{amount: '29.99', handle: 'quiet-form-i-art-print'}],
  );
});
