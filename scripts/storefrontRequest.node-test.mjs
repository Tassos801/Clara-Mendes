import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RETRIES,
  RETRY_WAIT_MS,
  storefrontRequest,
} from './lib/storefront-request.mjs';

// What fetch() rejects with when the network fails: a TypeError whose cause
// carries undici's code.
const networkError = (code) =>
  new TypeError('fetch failed', {
    cause: Object.assign(new Error(code), {code}),
  });
const answer = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });

/** A fetch that plays `steps` in order (an Error is thrown) and counts calls. */
function scripted(...steps) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push(JSON.parse(init.body));
    const step = steps[Math.min(calls.length, steps.length) - 1];
    if (step instanceof Error) throw step;
    return step();
  };
  return {fetch, calls};
}

function send(fetch, request = {}) {
  const waits = [];
  const log = [];
  const result = storefrontRequest(
    {
      endpoint: 'https://example.myshopify.com/api/2025-10/graphql.json',
      token: 'token',
      query: 'mutation { cartCreate { cart { id } } }',
      variables: {country: 'CH'},
      label: 'CH cart create',
      ...request,
    },
    {
      fetch,
      sleep: async (ms) => void waits.push(ms),
      log: (line) => void log.push(line),
    },
  );
  return {result, waits, log};
}

const OK = () => answer({data: {cartCreate: {cart: {id: 'gid://cart/1'}}}});

test('a request that never reached Shopify is sent again, a cart create included', async () => {
  // 2026-11-12: getaddrinfo ENOTFOUND for the store domain mid-run.
  const {fetch, calls} = scripted(
    networkError('ENOTFOUND'),
    networkError('EAI_AGAIN'),
    OK,
  );
  const {result, waits, log} = send(fetch, {repeatable: false});
  assert.deepEqual(await result, {cartCreate: {cart: {id: 'gid://cart/1'}}});
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], calls[2]);
  assert.deepEqual(waits, [RETRY_WAIT_MS, 2 * RETRY_WAIT_MS]);
  assert.match(
    log[0],
    /^CH cart create: ENOTFOUND; sending it again in 15 s \(retry 1 of 4\)$/,
  );
});

test('a cart create that may have reached Shopify is never sent twice', async () => {
  for (const failure of [
    networkError('ECONNRESET'),
    networkError('UND_ERR_SOCKET'),
  ]) {
    const {fetch, calls} = scripted(failure, OK);
    const {result, waits} = send(fetch, {repeatable: false});
    await assert.rejects(result, (error) => error === failure);
    assert.equal(calls.length, 1);
    assert.deepEqual(waits, []);
  }
  // A 5xx may come after the cart was made: not sent again either.
  const {fetch, calls} = scripted(() => answer({}, 502), OK);
  await assert.rejects(send(fetch, {repeatable: false}).result, /answered 502/);
  assert.equal(calls.length, 1);
});

test('a read or a line swap is sent again after any network failure or a 5xx', async () => {
  const {fetch, calls} = scripted(
    networkError('ECONNRESET'),
    () => answer({}, 503),
    networkError('UND_ERR_SOCKET'),
    () => answer({data: {cartLinesUpdate: {cart: {id: 'gid://cart/1'}}}}),
  );
  const {result, waits} = send(fetch, {
    repeatable: true,
    label: 'CH line swap',
  });
  assert.deepEqual(await result, {
    cartLinesUpdate: {cart: {id: 'gid://cart/1'}},
  });
  assert.equal(calls.length, 4);
  assert.deepEqual(
    waits,
    [1, 2, 3].map((n) => n * RETRY_WAIT_MS),
  );
});

test('throttles and GraphQL errors are not sent again', async () => {
  // Sending more while Shopify throttles the IP only prolongs it.
  for (const status of [429, 430]) {
    const {fetch, calls} = scripted(() => answer({}, status), OK);
    await assert.rejects(send(fetch, {repeatable: true}).result);
    assert.equal(calls.length, 1, String(status));
  }
  const {fetch, calls} = scripted(
    () => answer({errors: [{message: 'Field does not exist'}]}),
    OK,
  );
  await assert.rejects(
    send(fetch, {repeatable: true}).result,
    /Field does not exist/,
  );
  assert.equal(calls.length, 1);
});

test('it gives up after four retries, 150 s of waiting, with the last failure', async () => {
  const last = networkError('ENOTFOUND');
  const {fetch, calls} = scripted(
    ...Array(RETRIES).fill(networkError('ENOTFOUND')),
    last,
  );
  const {result, waits} = send(fetch, {repeatable: false});
  await assert.rejects(result, (error) => error === last);
  assert.equal(calls.length, RETRIES + 1);
  assert.equal(
    waits.reduce((sum, ms) => sum + ms, 0),
    150_000,
  );
});

test('the fee script marks only its cart create as not repeatable', async () => {
  const {readFileSync} = await import('node:fs');
  const source = readFileSync(
    new URL('./build-shipping-fees.mjs', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /await fetch\(/);
  assert.equal(source.match(/await storefront\(/g)?.length, 3);
  assert.equal(source.match(/repeatable: false/g)?.length, 1);
  const create = source.match(/storefront\(\s*CREATE,[\s\S]*?\)\.cartCreate/);
  assert.match(create?.[0] ?? '', /\{repeatable: false, label: /);
});
