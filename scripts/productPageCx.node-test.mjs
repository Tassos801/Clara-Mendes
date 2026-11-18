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

test('a variant the Black Friday line seems to cover but the offer leaves out says so', async () => {
  const {blackFridayExclusionNote: note} = await import(
    '../app/lib/blackFridayProductNote.ts'
  );
  // Discounted, or never named by the sitewide line: no note.
  assert.equal(note('Art Prints', '16 × 20 in / Unframed'), null);
  assert.equal(note('Blankets', '50 × 60 in'), null);
  assert.equal(note('Hoodies', 'Bone / M', 'counter-diagonal-hoodie'), null);
  assert.equal(note('Cards', '5 × 7 in'), null);
  // No variant chosen yet: nothing is promised either way.
  assert.equal(note('Art Prints', null), null);
  // Left out by the rules in app/lib/blackFriday.ts.
  assert.match(note('Art Prints', '16 × 20 in / Black frame'), /unframed prints/);
  assert.match(
    note('Personalised Art', '20 × 24 in / Natural frame'),
    /framed 20 × 24 in/,
  );
  assert.equal(note('Personalised Art', '20 × 24 in / Unframed'), null);
  for (const [type, handle] of [
    ['Hoodies', 'counter-diagonal-premium-hoodie'],
    ['Hats', 'counter-diagonal-cap'],
    ['Acrylic Prints', 'irises-acrylic-print'],
  ])
    assert.equal(note(type, 'One size', handle), 'Not in the Black Friday offer.');
});
