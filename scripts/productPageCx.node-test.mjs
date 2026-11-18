import assert from 'node:assert/strict';
import test from 'node:test';

import {museumPairings} from '../app/lib/artistShops.ts';

// The three Art & Words blankets and the plain blanket of the same work.
const EDITIONS = [
  'composition-with-red-yellow-and-blue',
  'painting-with-troika',
  'the-great-wave-off-kanagawa',
];

test('a plain blanket and its Art & Words edition lead each other’s pairings', () => {
  for (const slug of EDITIONS) {
    const plain = `${slug}-blanket`;
    const words = `${slug}-quote-blanket`;
    const first = (handle) => museumPairings(handle)?.products[0]?.handle;
    assert.equal(first(plain), words, plain);
    assert.equal(first(words), plain, words);
  }
});
