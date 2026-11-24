import assert from 'node:assert/strict';
import test from 'node:test';
import {blackFridayDiscountPercent} from '../app/lib/blackFriday.ts';
import {
  blackFridayCardLine,
  blackFridayCardTag,
} from '../app/lib/blackFridayCard.ts';

test('cards name the percent for types the offer covers in full', () => {
  assert.equal(blackFridayCardLine('Blankets', 'great-wave-blanket'), '20% off in your cart');
  assert.equal(blackFridayCardLine('Phone Cases', 'x-tough-phone-case'), '20% off in your cart');
  assert.equal(blackFridayCardLine('Hoodies', 'counter-diagonal-heavyweight-hoodie'), '10% off in your cart');
  assert.equal(blackFridayCardLine('Framed Art', 'x-framed'), '10% off in your cart');
});

test('art prints say only the unframed ones are in, as the product page rule does', () => {
  assert.equal(blackFridayCardLine('Art Prints', 'x-art-print'), 'Unframed: 20% off in your cart');
  assert.equal(blackFridayDiscountPercent('Art Prints', '8 × 10 in / Unframed'), 20);
  assert.equal(blackFridayDiscountPercent('Art Prints', '8 × 10 in / Black frame'), null);
});

test('no line for pieces outside the offer', () => {
  for (const type of ['Cards', 'Postcards', 'Book Nooks', 'Acrylic Prints', 'Metal Prints', 'Hats', 'Personalised Art', '', null]) {
    assert.equal(blackFridayCardLine(type, 'x'), null, String(type));
  }
  assert.equal(blackFridayCardLine('Hoodies', 'counter-diagonal-premium-hoodie'), null);
});

test('every card line agrees with the product page percent', () => {
  for (const type of ['Blankets', 'Cushions', 'Mugs', 'Plant Pots', 'Hanger Prints', 'T-Shirts', 'Canvas Art', 'Tote Bags']) {
    const percent = blackFridayDiscountPercent(type, 'Any / Variant', 'x');
    assert.equal(blackFridayCardLine(type, 'x'), `${percent}% off in your cart`, type);
  }
});

test('cards show the offer as a short tag with the full line as its label', () => {
  assert.deepEqual(blackFridayCardTag('Blankets', 'great-wave-blanket'), {
    tag: '−20%',
    label: '20% off in your cart',
  });
  assert.deepEqual(blackFridayCardTag('Art Prints', 'x-art-print'), {
    tag: '−20%',
    label: 'Unframed: 20% off in your cart',
  });
  assert.deepEqual(blackFridayCardTag('Hoodies', 'counter-diagonal-heavyweight-hoodie'), {
    tag: '−10%',
    label: '10% off in your cart',
  });
  assert.equal(blackFridayCardTag('Book Nooks', 'x'), null);
  assert.equal(blackFridayCardTag('Hoodies', 'counter-diagonal-premium-hoodie'), null);
});
