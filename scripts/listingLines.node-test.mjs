import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LINE_ORDER,
  productLine,
  rotateByLine,
} from '../app/lib/listingLines.ts';

const p = (id, productType) => ({id, productType});

test('product types map to the lines the shop rotates through', () => {
  assert.deepEqual(LINE_ORDER, [
    'prints',
    'cases',
    'clothing',
    'nooks',
    'pots',
    'cards',
    'sky',
    'other',
  ]);
  assert.equal(productLine(p(1, 'Art Prints')), 'prints');
  assert.equal(productLine(p(1, 'Phone Cases')), 'cases');
  assert.equal(productLine(p(1, 'Studio Top')), 'clothing');
  assert.equal(productLine(p(1, 'Yoga Leggings')), 'clothing');
  assert.equal(productLine(p(1, 'Book Nooks')), 'nooks');
  assert.equal(productLine(p(1, 'Plant Pots')), 'pots');
  assert.equal(productLine(p(1, 'Cards')), 'cards');
  assert.equal(productLine(p(1, 'Postcards')), 'cards');
  assert.equal(productLine(p(1, 'Canvas Art')), 'other');
  assert.equal(productLine(p(1, null)), 'other');
  assert.equal(productLine({id: 1}), 'other');
});

test('rotation alternates lines and keeps each line in its given order', () => {
  const input = [
    p('tank', 'Studio Top'),
    p('bra', 'Sports Bra'),
    p('nook1', 'Book Nooks'),
    p('nook2', 'Book Nooks'),
    p('pot1', 'Plant Pots'),
    p('case', 'Phone Cases'),
    p('print1', 'Art Prints'),
    p('print2', 'Art Prints'),
    p('canvas', 'Canvas Art'),
  ];
  const out = rotateByLine(input).map((x) => x.id);
  assert.deepEqual(out, [
    'print1',
    'case',
    'tank',
    'nook1',
    'pot1',
    'canvas',
    'print2',
    'bra',
    'nook2',
  ]);
  // Nothing lost, nothing duplicated, input untouched.
  assert.equal(out.length, input.length);
  assert.equal(new Set(out).size, input.length);
  assert.equal(input[0].id, 'tank');
});

test('rotation of an empty or single-line list is a copy of the input', () => {
  assert.deepEqual(rotateByLine([]), []);
  const prints = [p('a', 'Art Prints'), p('b', 'Art Prints')];
  const out = rotateByLine(prints);
  assert.deepEqual(out.map((x) => x.id), ['a', 'b']);
  assert.notEqual(out, prints);
});
