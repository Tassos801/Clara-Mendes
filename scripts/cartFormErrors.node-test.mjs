import assert from 'node:assert/strict';
import {getCartFormErrorMessages} from '../app/lib/cartFormErrors.ts';

assert.deepEqual(getCartFormErrorMessages(null), []);
assert.deepEqual(getCartFormErrorMessages({errors: []}), []);

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
