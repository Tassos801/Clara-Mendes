import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

import {useMarketingCheckoutUrl} from '../app/hooks/useMarketingCheckoutUrl.ts';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BASE_URL = 'https://checkout.shopclaramendes.com/checkouts/test';
const SNAPSHOT = {
  version: 1,
  session_id: 'session-1',
  current_page: 'https://shopclaramendes.com/products/test',
  first_touch: {
    captured_at: '2026-08-13T00:00:00.000Z',
    landing_page: 'https://shopclaramendes.com/?gclid=paid-click',
    source: 'google',
    gclid: 'paid-click',
  },
  last_touch: {
    captured_at: '2026-08-13T00:00:00.000Z',
    landing_page: 'https://shopclaramendes.com/?gclid=paid-click',
    source: 'google',
    gclid: 'paid-click',
  },
};

function Harness(props) {
  const href = useMarketingCheckoutUrl(props);
  return React.createElement('a', {href});
}

test('checkout href gains attribution after grant and loses it synchronously on revoke', async () => {
  let reads = 0;
  const readSnapshot = () => {
    reads += 1;
    return SNAPSHOT;
  };
  let renderer;

  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(Harness, {
        checkoutUrl: BASE_URL,
        consent: 'unknown',
        readSnapshot,
      }),
    );
    await Promise.resolve();
  });
  assert.equal(renderer.root.findByType('a').props.href, BASE_URL);
  assert.equal(reads, 0);

  await act(async () => {
    renderer.update(
      React.createElement(Harness, {
        checkoutUrl: BASE_URL,
        consent: 'granted',
        readSnapshot,
      }),
    );
    await Promise.resolve();
  });
  assert.match(renderer.root.findByType('a').props.href, /gclid=paid-click/);
  assert.equal(reads, 1);

  renderer.update(
    React.createElement(Harness, {
      checkoutUrl: BASE_URL,
      consent: 'denied',
      readSnapshot,
    }),
  );
  assert.equal(
    renderer.root.findByType('a').props.href,
    BASE_URL,
    'revocation must remove attribution in the same render',
  );

  await act(async () => {
    renderer.unmount();
  });
});
