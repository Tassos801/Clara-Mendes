import assert from 'node:assert/strict';
import test from 'node:test';
import {orderReviewGids} from '../app/lib/reviews.server.ts';

const gid = (n) => `gid://shopify/Metaobject/${n}`;

test('a new draft goes behind every approved review', () => {
  const existing = [gid(5), gid(4), gid(3), gid(2), gid(1)];
  const statuses = new Map([
    [gid(5), 'DRAFT'],
    [gid(4), 'ACTIVE'],
    [gid(3), 'DRAFT'],
    [gid(2), 'ACTIVE'],
    [gid(1), 'ACTIVE'],
  ]);
  assert.deepEqual(orderReviewGids(existing, statuses, gid(6)), [
    gid(4), gid(2), gid(1), gid(6), gid(5), gid(3),
  ]);
});

test('fifty pending drafts never push approved reviews out of the first 50', () => {
  const approved = [gid(1), gid(2), gid(3)];
  let list = [...approved];
  const statuses = new Map(approved.map((g) => [g, 'ACTIVE']));
  for (let n = 100; n < 160; n += 1) {
    list = orderReviewGids(list, statuses, gid(n));
    statuses.set(gid(n), 'DRAFT');
  }
  assert.deepEqual(list.slice(0, 3), approved);
  assert.equal(list.length, 63);
});

test('a review approved in Admin moves up among the approved; deleted ones drop out', () => {
  const existing = [gid(9), gid(8), gid(7)];
  const statuses = new Map([[gid(9), 'DRAFT'], [gid(8), 'ACTIVE']]); // 7 deleted
  assert.deepEqual(orderReviewGids(existing, statuses, gid(10)), [
    gid(8), gid(10), gid(9),
  ]);
  statuses.set(gid(9), 'ACTIVE'); statuses.set(gid(10), 'DRAFT');
  assert.deepEqual(orderReviewGids([gid(8), gid(10), gid(9)], statuses, gid(11)), [
    gid(8), gid(9), gid(11), gid(10),
  ]);
});
