import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {unprintableCharacters} from '../app/lib/sky/params.ts';

test('a gift note flags only what the slip font cannot set', () => {
  const check = (note) => unprintableCharacters(note.replace(/\s/g, ' '));
  // Line breaks and accented Latin are fine on the card.
  assert.deepEqual(check('For Zoë —\nthe sky the night we met.'), []);
  // Emoji and CJK are left out on paper, so the studio says which.
  assert.deepEqual(check('Love you 😊😊\n星'), ['😊', '星']);
});

test('the studio warns under the gift note before checkout', () => {
  const source = readFileSync(
    new URL('../app/components/SkyStudio.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /unprintableCharacters\(giftNote\.replace\(\/\\s\/g, ' '\)\)/);
  assert.match(source, /id="sky-gift-note-warning"/);
  assert.match(source, /can’t be printed on the card and will be left out\./);
});
