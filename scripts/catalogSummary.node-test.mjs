import assert from 'node:assert/strict';
import test from 'node:test';

import artCatalog from '../data/original-art-catalog.json' with {type: 'json'};
import {listShopCapsules} from '../app/lib/capsules.ts';
import {
  capitalize,
  catalogCounts,
  countWord,
} from '../app/lib/catalogSummary.ts';
import {
  collectionKind,
  PRINT_CATALOG,
  releasedPrintHandles,
} from '../app/lib/printCatalog.ts';

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
  // The copy counts Clara Mendes originals: museum reproductions (released
  // Floating World prints included) are left out.
  const studio = {
    collections: PRINT_CATALOG.collections.filter(
      (collection) => collectionKind(collection) === 'studio',
    ),
  };
  assert.equal(
    counts.works,
    artCatalog.length + releasedPrintHandles(studio).length,
  );
  assert.equal(counts.capsules, listShopCapsules(studio).length);
  assert.ok(
    releasedPrintHandles().length > releasedPrintHandles(studio).length,
    'released museum prints exist and are not counted',
  );
  assert.ok(counts.works >= 15 && counts.capsules >= 5);
});
