import assert from 'node:assert/strict';
import {
  getCartFormErrorMessages,
  getInapplicableDiscountMessages,
} from '../app/lib/cartFormErrors.ts';

assert.deepEqual(getCartFormErrorMessages(null), []);
assert.deepEqual(getCartFormErrorMessages({errors: []}), []);
assert.deepEqual(getCartFormErrorMessages({cart: {id: 'gid://1'}}), []);

assert.deepEqual(
  getCartFormErrorMessages({
    errors: [
      {message: 'This item is no longer available.'},
      {field: ['lines', '0', 'quantity'], message: 'Quantity is too high.'},
      'Storefront request failed.',
    ],
  }),
  [
    'This item is no longer available.',
    'Quantity is too high.',
    'Storefront request failed.',
  ],
);

assert.deepEqual(
  getCartFormErrorMessages({
    errors: [{code: 'INVALID'}],
  }),
  ['We could not update the cart. Please try again.'],
);

// Shopify rejects a mutation through `userErrors` (sold out, quantity limits,
// unknown merchandise) while `errors` stays empty and `cart` is still
// returned. Those rejections must read as failures too.
assert.deepEqual(
  getCartFormErrorMessages({
    cart: {id: 'gid://shopify/Cart/1'},
    errors: undefined,
    userErrors: [
      {
        code: 'INVALID',
        field: ['lines', '0', 'quantity'],
        message: "The product 'Quiet Form I' is already sold out.",
      },
    ],
    warnings: [],
  }),
  ["The product 'Quiet Form I' is already sold out."],
);

// Transport errors come first, then user errors; duplicates collapse so the
// customer never sees the same sentence twice.
assert.deepEqual(
  getCartFormErrorMessages({
    errors: [{message: 'Storefront request failed.'}],
    userErrors: [
      {message: 'Quantity is too high.'},
      {message: 'Quantity is too high.'},
      {code: 'INVALID', message: ''},
    ],
  }),
  [
    'Storefront request failed.',
    'Quantity is too high.',
    'We could not update the cart. Please try again.',
  ],
);

// Stock problems arrive as `warnings` with an empty `userErrors` (observed
// on the dev store: the sold-out line is kept at quantity zero). They must
// read as failures so the drawer does not open on a €0.00 line.
assert.deepEqual(
  getCartFormErrorMessages({
    cart: {id: 'gid://shopify/Cart/1', totalQuantity: 0},
    errors: undefined,
    userErrors: [],
    warnings: [
      {
        code: 'MERCHANDISE_OUT_OF_STOCK',
        message: "The product 'Quiet Form I Art Print' is already sold out.",
        target: 'gid://shopify/CartLine/1?cart=1',
      },
    ],
  }),
  ["The product 'Quiet Form I Art Print' is already sold out."],
);

// A discount code Shopify keeps on the cart but cannot apply (unknown code,
// or conditions not met) is the only signal the apply form gets back.
assert.deepEqual(getInapplicableDiscountMessages(undefined), []);
assert.deepEqual(getInapplicableDiscountMessages([]), []);
assert.deepEqual(
  getInapplicableDiscountMessages([
    {code: 'WELCOME10', applicable: true},
    {code: 'nope', applicable: false},
  ]),
  ['“NOPE” can’t be applied to this cart.'],
);
