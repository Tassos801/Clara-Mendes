import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  cartLineDiscounts,
  cartLineOriginalTotal,
  cartLineSavings,
} from '../app/lib/cartDiscounts.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

const eur = (amount) => ({amount, currencyCode: 'EUR'});

// Shaped like the Storefront API's CartLine with the CartLine fragment
// (app/lib/fragments.ts): an automatic discount allocated to the line.
const blanketLine = {
  id: 'gid://shopify/CartLine/1',
  quantity: 2,
  cost: {
    subtotalAmount: eur('100.0'),
    totalAmount: eur('80.0'),
    amountPerQuantity: eur('50.0'),
    compareAtAmountPerQuantity: null,
  },
  discountAllocations: [
    {
      __typename: 'CartAutomaticDiscountAllocation',
      discountedAmount: eur('20.0'),
      title: 'Black Friday 20% off',
    },
  ],
};

const hoodieLine = {
  id: 'gid://shopify/CartLine/2',
  quantity: 1,
  cost: {subtotalAmount: eur('60.0'), totalAmount: eur('54.0')},
  discountAllocations: [
    {
      __typename: 'CartAutomaticDiscountAllocation',
      discountedAmount: eur('6.0'),
      title: 'Black Friday 10% off',
    },
  ],
};

const cardLine = {
  id: 'gid://shopify/CartLine/3',
  quantity: 1,
  cost: {subtotalAmount: eur('6.99'), totalAmount: eur('6.99')},
  discountAllocations: [],
};

test('an automatic discount shows its title and amount', () => {
  assert.deepEqual(cartLineDiscounts(blanketLine), [
    {label: 'Black Friday 20% off', amount: eur('20.00')},
  ]);
  assert.deepEqual(cartLineOriginalTotal(blanketLine), eur('100.0'));
});

test('a line without discounts shows nothing extra', () => {
  assert.deepEqual(cartLineDiscounts(cardLine), []);
  assert.equal(cartLineOriginalTotal(cardLine), null);
  // An optimistic line (just added, no cost yet) has no allocations.
  assert.deepEqual(cartLineDiscounts({}), []);
  assert.equal(cartLineOriginalTotal({}), null);
});

test('zero amounts drop out; code allocations are named by their code', () => {
  const line = {
    discountAllocations: [
      {discountedAmount: eur('0.0'), title: 'Nothing'},
      null,
      {discountedAmount: eur('2.5'), code: 'WELCOME'},
      {discountedAmount: eur('1.25'), code: 'WELCOME'},
      {discountedAmount: eur('3.0')},
    ],
  };
  assert.deepEqual(cartLineDiscounts(line), [
    {label: 'Code WELCOME', amount: eur('3.75')},
    {label: 'Discount', amount: eur('3.00')},
  ]);
});

test('the cart sums the line savings that are already in the subtotal', () => {
  assert.deepEqual(
    cartLineSavings([blanketLine, hoodieLine, cardLine, null]),
    eur('26.00'),
  );
  assert.equal(cartLineSavings([cardLine]), null);
  assert.equal(cartLineSavings([]), null);
});

test('the cart fragment reads line discounts and the pre-discount line price', () => {
  const fragments = read('app/lib/fragments.ts');
  const cartLine = fragments.slice(
    fragments.indexOf('fragment CartLine on CartLine'),
    fragments.indexOf('fragment CartLineComponent'),
  );
  assert.match(cartLine, /subtotalAmount \{\s*\.\.\.Money/);
  assert.match(
    cartLine,
    /discountAllocations \{[\s\S]*discountedAmount[\s\S]*\.\.\. on CartAutomaticDiscountAllocation \{\s*title/,
  );
  const item = read('app/components/CartLineItem.tsx');
  assert.match(item, /cartLineDiscounts\(line\)/);
  assert.match(item, /compareAtPrice=\{originalTotal\}/);
});
