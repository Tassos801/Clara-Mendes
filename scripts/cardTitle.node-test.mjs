import assert from 'node:assert/strict';
import test from 'node:test';
import {cardTitleParts} from '../app/lib/cardTitle.ts';

test('the first word of an artwork or design name is set in italics', () => {
  assert.deepEqual(cardTitleParts('Where Mist Rests Art Print'), {
    lead: 'Where',
    rest: ' Mist Rests Art Print',
  });
  assert.deepEqual(cardTitleParts('Counter-Diagonal Fitted Tank'), {
    lead: 'Counter-Diagonal',
    rest: ' Fitted Tank',
  });
  assert.deepEqual(cardTitleParts('Irises'), {lead: 'Irises', rest: ''});
});

test('titles that open with a plain product word stay upright', () => {
  for (const title of [
    'Art Tough Phone Case',
    'Fine Art Postcard',
    'Fine Art Greeting Card',
    'Stretched Canvas Art — 16 × 20 in',
    'Classic Frame',
  ]) {
    assert.deepEqual(cardTitleParts(title), {lead: null, rest: title}, title);
  }
});
