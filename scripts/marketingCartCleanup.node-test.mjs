import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

import {
  requestMarketingCartCleanup,
  useMarketingCartCleanup,
} from '../app/hooks/useMarketingCartCleanup.ts';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ATTRIBUTES = [
  {key: 'gclid', value: 'paid-click'},
  {key: 'app.note:v1', value: 'Keep exactly'},
];

function Harness(props) {
  useMarketingCartCleanup(props);
  return null;
}

async function renderHarness(props) {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness, props));
    await Promise.resolve();
  });
  return renderer;
}

async function updateHarness(renderer, props) {
  await act(async () => {
    renderer.update(React.createElement(Harness, props));
    await Promise.resolve();
  });
}

async function flushRetry() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test('mounted cleanup waits through unknown and grant, then submits on revoke', async () => {
  const calls = [];
  const requestCleanup = async (request) => {
    calls.push(request);
    return true;
  };
  const common = {
    attributes: ATTRIBUTES,
    requestCleanup,
    retryDelayMs: 0,
  };
  const renderer = await renderHarness({...common, consent: 'unknown'});

  assert.equal(calls.length, 0);
  await updateHarness(renderer, {...common, consent: 'granted'});
  assert.equal(calls.length, 0);
  await updateHarness(renderer, {...common, consent: 'denied'});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].signal.aborted, false);
  assert.equal(typeof calls[0].sourceSignature, 'string');

  renderer.unmount();
});

test('mounted cleanup retries failures three times and then stops', async () => {
  let calls = 0;
  const renderer = await renderHarness({
    attributes: ATTRIBUTES,
    consent: 'denied',
    maxAttempts: 3,
    requestCleanup: async () => {
      calls += 1;
      return false;
    },
    retryDelayMs: 0,
  });

  await flushRetry();
  await flushRetry();
  await flushRetry();
  assert.equal(calls, 3);

  renderer.unmount();
});

test('grant aborts an in-flight cleanup and suppresses its stale retry', async () => {
  let resolveRequest;
  let capturedSignal;
  let calls = 0;
  const requestCleanup = ({signal}) => {
    calls += 1;
    capturedSignal = signal;
    return new Promise((resolve) => {
      resolveRequest = resolve;
    });
  };
  const common = {
    attributes: ATTRIBUTES,
    requestCleanup,
    retryDelayMs: 0,
  };
  const renderer = await renderHarness({...common, consent: 'denied'});

  assert.equal(calls, 1);
  await updateHarness(renderer, {...common, consent: 'granted'});
  assert.equal(capturedSignal.aborted, true);

  resolveRequest(false);
  await flushRetry();
  assert.equal(calls, 1);

  renderer.unmount();
});

test('cleanup request rejects HTML, user errors, and stale marketing attributes', async () => {
  const signal = new AbortController().signal;
  const request = {signal, sourceSignature: 'signature'};

  assert.equal(
    await requestMarketingCartCleanup(
      request,
      async () => new Response('<html>document response</html>', {status: 200}),
    ),
    false,
  );
  assert.equal(
    await requestMarketingCartCleanup(request, async () =>
      Response.json({
        cart: {attributes: [{key: 'gift_note', value: 'Keep'}]},
        userErrors: [{message: 'Rejected'}],
      }),
    ),
    false,
  );
  assert.equal(
    await requestMarketingCartCleanup(request, async () =>
      Response.json({
        cart: {attributes: [{key: 'gclid', value: 'still-present'}]},
      }),
    ),
    false,
  );
  assert.equal(
    await requestMarketingCartCleanup(request, async (url, init) => {
      assert.equal(url, '/api/cart-attribution-cleanup');
      assert.equal(init.credentials, 'same-origin');
      assert.equal(init.method, 'POST');
      assert.equal(init.signal, signal);
      assert.equal(init.body.get('sourceSignature'), request.sourceSignature);
      return Response.json({
        cart: {attributes: [{key: 'gift_note', value: 'Keep'}]},
      });
    }),
    true,
  );
});
