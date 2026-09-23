import assert from 'node:assert/strict';
import test from 'node:test';

import artCatalog from '../data/original-art-catalog.json' with {type: 'json'};
import {listShopCapsules} from '../app/lib/capsules.ts';
import {
  capitalize,
  catalogCounts,
  countWord,
} from '../app/lib/catalogSummary.ts';
import {releasedPrintHandles} from '../app/lib/printCatalog.ts';

test('counts read as words in storefront copy', () => {
  assert.equal(countWord(5), 'five');
  assert.equal(countWord(19), 'nineteen');
  assert.equal(countWord(20), 'twenty');
  assert.equal(countWord(24), 'twenty-four');
  assert.equal(countWord(40), 'forty');
  assert.equal(countWord(120), '120');
  assert.equal(capitalize('six'), 'Six');
});

test('catalogue counts follow the data files, not hard-coded copy', () => {
  const counts = catalogCounts();
  assert.equal(counts.works, artCatalog.length + releasedPrintHandles().length);
  assert.equal(counts.capsules, listShopCapsules().length);
  assert.ok(counts.works >= 15 && counts.capsules >= 5);
});
