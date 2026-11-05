import assert from 'node:assert/strict';
import test from 'node:test';
import {ListingCursorError} from '../app/lib/museumListingOrder.ts';
import {indexCursor, pageByIndex} from '../app/lib/listingPage.ts';

const ITEMS = Array.from({length: 10}, (_, i) => `p${i}`);

test('the first page, forward paging and the last page', () => {
  const page1 = pageByIndex({first: 4}, ITEMS);
  assert.deepEqual(page1.nodes, ['p0', 'p1', 'p2', 'p3']);
  assert.deepEqual(page1.pageInfo, {
    endCursor: 'i.3',
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: 'i.0',
  });

  const page2 = pageByIndex({first: 4, endCursor: page1.pageInfo.endCursor}, ITEMS);
  assert.deepEqual(page2.nodes, ['p4', 'p5', 'p6', 'p7']);
  assert.equal(page2.pageInfo.hasPreviousPage, true);

  const page3 = pageByIndex({first: 4, endCursor: page2.pageInfo.endCursor}, ITEMS);
  assert.deepEqual(page3.nodes, ['p8', 'p9']);
  assert.deepEqual(page3.pageInfo, {
    endCursor: 'i.9',
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: 'i.8',
  });
});

test('backward paging mirrors forward paging', () => {
  const last = pageByIndex({last: 4}, ITEMS);
  assert.deepEqual(last.nodes, ['p6', 'p7', 'p8', 'p9']);
  assert.equal(last.pageInfo.hasNextPage, false);
  assert.equal(last.pageInfo.hasPreviousPage, true);

  const prev = pageByIndex({last: 4, startCursor: last.pageInfo.startCursor}, ITEMS);
  assert.deepEqual(prev.nodes, ['p2', 'p3', 'p4', 'p5']);

  const first = pageByIndex({last: 4, startCursor: prev.pageInfo.startCursor}, ITEMS);
  assert.deepEqual(first.nodes, ['p0', 'p1']);
  assert.equal(first.pageInfo.hasPreviousPage, false);
  assert.equal(first.pageInfo.hasNextPage, true);
});

test('an empty list pages to an empty page', () => {
  assert.deepEqual(pageByIndex({first: 24}, []), {
    nodes: [],
    pageInfo: {
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
    },
  });
});

test('cursors this listing did not issue are rejected', () => {
  assert.equal(indexCursor(7), 'i.7');
  for (const cursor of ['s.abc', 'm.3', 'i.', 'i.x', 'i.1234567', '7']) {
    assert.throws(
      () => pageByIndex({first: 4, endCursor: cursor}, ITEMS),
      ListingCursorError,
      cursor,
    );
  }
  // Past the end (the list shrank since the cursor was issued).
  assert.throws(() => pageByIndex({first: 4, endCursor: 'i.10'}, ITEMS), ListingCursorError);
  assert.throws(() => pageByIndex({first: 4, endCursor: 'i.9'}, ITEMS), ListingCursorError);
  assert.throws(() => pageByIndex({first: 4, endCursor: 'i.0'}, []), ListingCursorError);
  assert.throws(() => pageByIndex({last: 4, startCursor: 'i.11'}, ITEMS), ListingCursorError);
});
