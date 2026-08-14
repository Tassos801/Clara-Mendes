import assert from 'node:assert/strict';
import test from 'node:test';

import {cleanMarketingCartAttributes} from '../app/lib/marketingCartCleanup.server.ts';
import {cartAttributesSignature} from '../app/lib/marketingAttribution.ts';

test('server cleanup preserves unrelated attributes and verifies the returned cart', async () => {
  const attributes = [
    {key: 'gclid', value: 'paid-click'},
    {key: 'app.note:v1', value: '  Keep  spacing\nand punctuation  '},
  ];
  let submitted;
  const result = await cleanMarketingCartAttributes({
    cart: {
      get: async () => ({id: 'gid://shopify/Cart/1', attributes}),
      updateAttributes: async (nextAttributes) => {
        submitted = nextAttributes;
        return {
          cart: {id: 'gid://shopify/Cart/1', attributes: nextAttributes},
          errors: [],
          userErrors: [],
        };
      },
    },
    expectedSourceSignature: cartAttributesSignature(attributes),
  });

  assert.deepEqual(submitted, [attributes[1]]);
  assert.equal(result.status, 200);
  assert.deepEqual(result.payload.cart.attributes, [attributes[1]]);
});

test('server cleanup fails closed when the cart changed after the client planned it', async () => {
  let updates = 0;
  const currentAttributes = [{key: 'gclid', value: 'new-click'}];
  const result = await cleanMarketingCartAttributes({
    cart: {
      get: async () => ({
        id: 'gid://shopify/Cart/1',
        attributes: currentAttributes,
      }),
      updateAttributes: async () => {
        updates += 1;
        return {};
      },
    },
    expectedSourceSignature: cartAttributesSignature([
      {key: 'gclid', value: 'old-click'},
    ]),
  });

  assert.equal(updates, 0);
  assert.equal(result.status, 409);
  assert.equal(result.payload.reason, 'stale_cart');
});

test('server cleanup surfaces Shopify user errors as a non-success response', async () => {
  const attributes = [{key: 'gclid', value: 'paid-click'}];
  const result = await cleanMarketingCartAttributes({
    cart: {
      get: async () => ({id: 'gid://shopify/Cart/1', attributes}),
      updateAttributes: async () => ({
        cart: {id: 'gid://shopify/Cart/1', attributes},
        userErrors: [{message: 'Rejected'}],
      }),
    },
    expectedSourceSignature: cartAttributesSignature(attributes),
  });

  assert.equal(result.status, 422);
  assert.deepEqual(result.payload.userErrors, [{message: 'Rejected'}]);
});
