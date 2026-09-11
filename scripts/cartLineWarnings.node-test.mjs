import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findEmptyWarnedLineIds,
  removeUnfulfilledLines,
} from '../app/lib/cartLineWarnings.ts';

const CART_ID = 'gid://shopify/Cart/hWNG?key=abc';
const SOLD_OUT_LINE = 'gid://shopify/CartLine/9320-4131?cart=hWNG';
const KEPT_LINE = 'gid://shopify/CartLine/1111-2222?cart=hWNG';

// The exact shape Shopify returned on the dev store for a sold-out variant
// through Hydrogen's minimal mutation fragment: no lines, no userErrors, a
// MERCHANDISE_OUT_OF_STOCK warning targeting the line it kept at quantity 0.
const soldOutResult = {
  cart: {
    id: CART_ID,
    totalQuantity: 0,
    checkoutUrl: 'https://checkout.example/cart/c/hWNG',
  },
  errors: undefined,
  userErrors: [],
  warnings: [
    {
      code: 'MERCHANDISE_OUT_OF_STOCK',
      message: "The product 'Quiet Form I Art Print' is already sold out.",
      target: SOLD_OUT_LINE,
    },
  ],
};

test('without lines in the result the flagged target is trusted', () => {
  assert.deepEqual(findEmptyWarnedLineIds(soldOutResult), [SOLD_OUT_LINE]);
  assert.deepEqual(findEmptyWarnedLineIds(undefined), []);
  assert.deepEqual(findEmptyWarnedLineIds({cart: null, warnings: []}), []);
});

test('with lines present only the zero-quantity flagged line is selected', () => {
  const withLines = {
    ...soldOutResult,
    cart: {
      ...soldOutResult.cart,
      lines: {
        nodes: [
          {id: KEPT_LINE, quantity: 1},
          {id: SOLD_OUT_LINE, quantity: 0},
        ],
      },
    },
  };
  assert.deepEqual(findEmptyWarnedLineIds(withLines), [SOLD_OUT_LINE]);

  // A flagged line that somehow kept a quantity is left alone.
  const stillStocked = {
    ...withLines,
    cart: {
      ...withLines.cart,
      lines: {nodes: [{id: SOLD_OUT_LINE, quantity: 1}]},
    },
  };
  assert.deepEqual(findEmptyWarnedLineIds(stillStocked), []);
});

test('a target keyed by a different cart query still matches the line', () => {
  const ids = findEmptyWarnedLineIds({
    cart: {id: CART_ID, lines: {nodes: [{id: SOLD_OUT_LINE, quantity: 0}]}},
    warnings: [
      {
        code: 'MERCHANDISE_OUT_OF_STOCK',
        message: 'sold out',
        target: 'gid://shopify/CartLine/9320-4131?cart=other',
      },
    ],
  });
  assert.deepEqual(ids, [SOLD_OUT_LINE]);
});

test('a clamped (not-enough-stock) line is never removed', () => {
  const warnings = [
    {
      code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
      message: 'Only 2 available',
      target: KEPT_LINE,
    },
  ];
  assert.deepEqual(findEmptyWarnedLineIds({cart: {id: CART_ID}, warnings}), []);
  assert.deepEqual(
    findEmptyWarnedLineIds({
      cart: {id: CART_ID, lines: {nodes: [{id: KEPT_LINE, quantity: 2}]}},
      warnings,
    }),
    [],
  );
});

test('unrelated warnings never remove anything', () => {
  const ids = findEmptyWarnedLineIds({
    cart: {id: CART_ID},
    warnings: [{code: 'PAYMENTS_GIFT_CARDS_UNAVAILABLE', message: 'x'}],
  });
  assert.deepEqual(ids, []);
});

test('the empty line is removed and the warning kept for the form', async () => {
  const calls = [];
  const out = await removeUnfulfilledLines({
    result: soldOutResult,
    removeLines: async (lineIds) => {
      calls.push(lineIds);
      return {
        cart: {...soldOutResult.cart, totalQuantity: 0},
        userErrors: [],
        warnings: [],
      };
    },
  });

  assert.deepEqual(calls, [[SOLD_OUT_LINE]]);
  assert.equal(out.cart.totalQuantity, 0);
  assert.equal(out.warnings, soldOutResult.warnings);
});

test('nothing is called when no line needs removing', async () => {
  let calls = 0;
  const result = {cart: {id: CART_ID}, warnings: []};
  const out = await removeUnfulfilledLines({
    result,
    removeLines: async () => {
      calls += 1;
      return null;
    },
  });
  assert.equal(calls, 0);
  assert.equal(out, result);
});

test('a refused or failed removal keeps the original result', async () => {
  const logged = [];
  const refused = await removeUnfulfilledLines({
    result: soldOutResult,
    removeLines: async () => ({
      cart: soldOutResult.cart,
      userErrors: [{message: 'nope'}],
    }),
    onError: (error) => logged.push(error),
  });
  assert.equal(refused, soldOutResult);

  const failed = await removeUnfulfilledLines({
    result: soldOutResult,
    removeLines: async () => {
      throw new Error('network');
    },
    onError: (error) => logged.push(error),
  });
  assert.equal(failed, soldOutResult);
  assert.equal(logged.length, 2);
});

const {relevantCartWarnings} = await import('../app/lib/cartLineWarnings.ts');
const OTHER_LINE = 'gid://shopify/CartLine/3333-4444?cart=hWNG';
const discountWarning = {
  code: 'DISCOUNT_NOT_FOUND',
  message: 'Enter a valid discount code',
  target: CART_ID,
};
const soldOut = {
  code: 'MERCHANDISE_OUT_OF_STOCK',
  message: 'sold out',
  target: SOLD_OUT_LINE,
};
const lowStock = {
  code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
  message: 'Only 2 available',
  target: OTHER_LINE,
};

test('a cart-level discount warning never reaches a line or gift-card form', () => {
  // Observed on the store: an inapplicable code stays on the cart and Shopify
  // re-attaches DISCOUNT_NOT_FOUND to every later mutation.
  for (const action of ['LinesAdd', 'LinesUpdate', 'LinesRemove', 'GiftCardCodesAdd', 'AttributesUpdateInput', 'DiscountCodesUpdate']) {
    assert.deepEqual(
      relevantCartWarnings({action, warnings: [discountWarning]}),
      [],
      action,
    );
  }
});

test('an add keeps stock warnings about the submitted variant only', () => {
  const lines = [
    {id: OTHER_LINE, quantity: 2, merchandise: {id: 'gid://shopify/ProductVariant/1'}},
    {id: SOLD_OUT_LINE, quantity: 0, merchandise: {id: 'gid://shopify/ProductVariant/2'}},
  ];
  const kept = relevantCartWarnings({
    action: 'LinesAdd',
    warnings: [discountWarning, lowStock, soldOut],
    merchandiseIds: ['gid://shopify/ProductVariant/2'],
    lines,
  });
  assert.deepEqual(kept, [soldOut]);

  // The empty line may already have been removed from the returned cart;
  // its warning still belongs to this add.
  const removed = relevantCartWarnings({
    action: 'LinesAdd',
    warnings: [soldOut, lowStock],
    merchandiseIds: ['gid://shopify/ProductVariant/2'],
    lines: [lines[0]],
  });
  assert.deepEqual(removed, [soldOut]);

  // Without any line information every stock warning passes.
  assert.deepEqual(
    relevantCartWarnings({action: 'LinesAdd', warnings: [lowStock, soldOut]}),
    [lowStock, soldOut],
  );
});

test('a quantity change or removal keeps warnings about its own lines', () => {
  assert.deepEqual(
    relevantCartWarnings({
      action: 'LinesUpdate',
      warnings: [discountWarning, lowStock, soldOut],
      lineIds: [OTHER_LINE],
    }),
    [lowStock],
  );
  assert.deepEqual(
    relevantCartWarnings({
      action: 'LinesRemove',
      warnings: [lowStock],
      lineIds: [SOLD_OUT_LINE],
    }),
    [],
  );
});

test('gift-card and buyer-identity forms keep only their own warning family', () => {
  const giftCards = {code: 'PAYMENTS_GIFT_CARDS_UNAVAILABLE', message: 'x'};
  const duplicate = {code: 'DUPLICATE_DELIVERY_ADDRESS', message: 'y'};
  assert.deepEqual(
    relevantCartWarnings({action: 'GiftCardCodesAdd', warnings: [discountWarning, giftCards, soldOut]}),
    [giftCards],
  );
  assert.deepEqual(
    relevantCartWarnings({action: 'BuyerIdentityUpdate', warnings: [duplicate, giftCards]}),
    [duplicate],
  );
  assert.deepEqual(relevantCartWarnings({action: 'Unknown', warnings: [soldOut]}), []);
});
