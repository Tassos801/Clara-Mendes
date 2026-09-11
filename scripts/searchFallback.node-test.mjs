import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getEmptyPredictiveSearchResult,
  getEmptyRegularSearchResult,
  runSearch,
  SEARCH_UNAVAILABLE_MESSAGE,
} from '../app/lib/search.ts';

test('a successful search passes straight through', async () => {
  const value = {
    type: 'regular',
    term: 'quiet',
    result: {total: 1, items: {}},
  };
  const logged = [];
  const out = await runSearch({
    type: 'regular',
    term: 'quiet',
    search: async () => value,
    onError: (error) => logged.push(error),
  });
  assert.equal(out, value);
  assert.deepEqual(logged, []);
});

test('a failed regular search degrades to a message instead of throwing', async () => {
  const failure = new Error('fetch failed');
  const logged = [];
  const out = await runSearch({
    type: 'regular',
    term: 'quiet form',
    search: async () => {
      throw failure;
    },
    onError: (error) => logged.push(error),
  });

  assert.deepEqual(logged, [failure]);
  assert.equal(out.type, 'regular');
  assert.equal(out.term, 'quiet form');
  assert.equal(out.error, SEARCH_UNAVAILABLE_MESSAGE);
  assert.deepEqual(out.result, getEmptyRegularSearchResult());
  // The page and <Pagination> read these shapes; they must be complete.
  assert.equal(out.result.total, 0);
  assert.deepEqual(out.result.items.products.pageInfo, {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
  assert.deepEqual(out.result.items.articles.nodes, []);
  assert.deepEqual(out.result.items.pages.nodes, []);
});

test('a failed predictive search keeps the predictive shape', async () => {
  const out = await runSearch({
    type: 'predictive',
    term: 'blue',
    search: async () => {
      throw new Error('boom');
    },
    onError: () => {},
  });
  assert.equal(out.type, 'predictive');
  assert.equal(out.term, 'blue');
  assert.equal(out.error, SEARCH_UNAVAILABLE_MESSAGE);
  assert.deepEqual(out.result, getEmptyPredictiveSearchResult());
});

test('the customer never sees a raw error message', async () => {
  const out = await runSearch({
    type: 'regular',
    term: 'x',
    search: async () => {
      throw new Error('Shopify API errors: internal token leak');
    },
    onError: () => {},
  });
  assert.doesNotMatch(out.error, /token leak/);
});
