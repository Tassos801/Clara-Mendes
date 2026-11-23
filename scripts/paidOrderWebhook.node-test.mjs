import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  isProdigiSandbox,
  PRODIGI_LIVE_BASE,
  PRODIGI_SANDBOX_BASE,
} from '../app/lib/prodigi.server.ts';
import {
  isTestOrderForLiveLab,
  orderHasProdigiApiLines,
} from '../app/lib/sky/fulfilment.ts';
import {handlePaidOrder} from '../app/lib/sky/paidOrder.server.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const LIVE = {
  SKY_SIGNING_SECRET: SECRET,
  PRODIGI_API_KEY: 'key',
  PRODIGI_API_BASE: PRODIGI_LIVE_BASE,
};
const SANDBOX = {SKY_SIGNING_SECRET: SECRET, PRODIGI_API_KEY: 'key'};
const TRIGGERED_AT = '2026-11-23T10:00:00.000Z';
const NOW = Date.parse('2026-11-23T10:12:00.000Z');
const NEEDS_ATTENTION = 'orders/paid NEEDS ATTENTION order 7001 (#2077): ';

function order(lineItems, overrides = {}) {
  return {
    id: 7001,
    name: '#2077',
    email: 'eva@example.com',
    phone: null,
    shipping_address: {
      name: 'Eva Papadopoulou',
      address1: 'Ermou 10',
      address2: '',
      city: 'Athens',
      province: null,
      zip: '10563',
      country_code: 'GR',
      phone: null,
    },
    line_items: lineItems,
    ...overrides,
  };
}

const caseOrder = (overrides) =>
  order(
    [{id: 1, sku: 'CM-MG-02-TC-IPHONE-16-PRO', quantity: 1, properties: []}],
    overrides,
  );
const printOrder = (overrides) =>
  order([{id: 1, sku: 'CM-PRINT-8X10', quantity: 1, properties: []}], overrides);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });

/** One delivery with Prodigi and the log replaced: the answer, the requests made and the lines logged. */
async function deliver(paidOrder, env, prodigiAnswers) {
  const requests = [];
  const lines = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({url: String(url), body: JSON.parse(init.body)});
    return prodigiAnswers
      ? prodigiAnswers()
      : json(200, {outcome: 'Created', order: {id: 'ord_1'}});
  };
  try {
    const answer = await handlePaidOrder(paidOrder, {
      env,
      triggeredAt: TRIGGERED_AT,
      now: NOW,
      log: {
        error: (line) => lines.push(line),
        warn: (line) => lines.push(line),
      },
    });
    return {answer, requests, lines};
  } finally {
    globalThis.fetch = realFetch;
  }
}

const hasCustomerData = (line) =>
  /Eva|Papadopoulou|Ermou|Athens|10563|example\.com/.test(line);

test('a real order with a phone case is sent to the lab as before', async () => {
  const {answer, requests, lines} = await deliver(caseOrder(), LIVE);
  assert.deepEqual(answer, {status: 200, body: 'Created'});
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${PRODIGI_LIVE_BASE}/v4.0/orders`);
  assert.equal(requests[0].body.idempotencyKey, 'shopify:7001');
  assert.deepEqual(lines, ['orders/paid: #2077 → Prodigi Created ord_1']);
  // `test: false` is what Shopify sends for a real order.
  const explicit = await deliver(caseOrder({test: false}), LIVE);
  assert.equal(explicit.requests.length, 1);
});

test('a Shopify test order is never sent to the live lab', async () => {
  const {answer, requests, lines} = await deliver(caseOrder({test: true}), LIVE);
  assert.equal(answer.status, 200);
  assert.equal(requests.length, 0);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /order 7001 \(#2077\) is a Shopify test order/);
  // It is not a lost order, so it must not show up in a NEEDS ATTENTION search.
  assert.doesNotMatch(lines[0], /NEEDS ATTENTION/);
  assert.equal(hasCustomerData(lines[0]), false);

  // Skipped before any configuration is read: nothing to retry, nothing to flag.
  const unconfigured = await deliver(caseOrder({test: true}), {
    PRODIGI_API_BASE: PRODIGI_LIVE_BASE,
  });
  assert.equal(unconfigured.answer.status, 200);
  assert.equal(unconfigured.requests.length, 0);
  assert.doesNotMatch(unconfigured.lines.join('\n'), /NEEDS ATTENTION/);
});

test('a test order still reaches the sandbox, which prints nothing', async () => {
  const {answer, requests, lines} = await deliver(
    caseOrder({test: true}),
    SANDBOX,
  );
  assert.deepEqual(answer, {status: 200, body: 'Created'});
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${PRODIGI_SANDBOX_BASE}/v4.0/orders`);
  assert.deepEqual(lines, ['orders/paid: #2077 → Prodigi sandbox Created ord_1']);
});

test('the test-order rule and the sandbox check', () => {
  assert.equal(isTestOrderForLiveLab({test: true}, {isSandbox: false}), true);
  assert.equal(isTestOrderForLiveLab({test: true}, {isSandbox: true}), false);
  assert.equal(isTestOrderForLiveLab({test: false}, {isSandbox: false}), false);
  assert.equal(isTestOrderForLiveLab({}, {isSandbox: false}), false);
  assert.equal(isTestOrderForLiveLab({test: null}, {isSandbox: false}), false);
  // An environment that names no API is the sandbox, as in the client.
  assert.equal(isProdigiSandbox({}), true);
  assert.equal(isProdigiSandbox({PRODIGI_API_BASE: ''}), true);
  assert.equal(
    isProdigiSandbox({PRODIGI_API_BASE: `${PRODIGI_SANDBOX_BASE}/`}),
    true,
  );
  assert.equal(isProdigiSandbox({PRODIGI_API_BASE: PRODIGI_LIVE_BASE}), false);
});

test('a failure Shopify will retry leaves the greppable line every time', async () => {
  const outage = await deliver(caseOrder(), LIVE, () =>
    json(503, {outcome: 'ServiceUnavailable'}),
  );
  assert.deepEqual(outage.answer, {status: 502, body: 'Prodigi error'});
  assert.deepEqual(outage.lines, [
    `${NEEDS_ATTENTION}not sent, Shopify will retry (attempt 12 min after the event): status 503, outcome ServiceUnavailable`,
  ]);

  const rotatedKey = await deliver(caseOrder(), LIVE, () => json(401, null));
  assert.equal(rotatedKey.answer.status, 502);
  assert.ok(rotatedKey.lines[0].startsWith(NEEDS_ATTENTION));
  assert.match(rotatedKey.lines[0], /status 401/);

  const network = await deliver(caseOrder(), LIVE, () => {
    throw new TypeError('fetch failed');
  });
  assert.equal(network.answer.status, 502);
  assert.ok(network.lines[0].startsWith(NEEDS_ATTENTION));
  assert.match(network.lines[0], /TypeError: fetch failed/);

  for (const line of [...outage.lines, ...rotatedKey.lines, ...network.lines]) {
    assert.equal(hasCustomerData(line), false);
  }
});

test('a delivery without a usable event time still leaves the line', async () => {
  const lines = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => json(500, null);
  try {
    const answer = await handlePaidOrder(caseOrder(), {
      env: LIVE,
      triggeredAt: null,
      log: {error: (line) => lines.push(line), warn: () => {}},
    });
    assert.equal(answer.status, 502);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(lines, [
    `${NEEDS_ATTENTION}not sent, Shopify will retry (event time unknown): status 500`,
  ]);
});

test('missing configuration leaves the line and asks Shopify to retry', async () => {
  const noKey = await deliver(caseOrder(), {
    SKY_SIGNING_SECRET: SECRET,
    PRODIGI_API_BASE: PRODIGI_LIVE_BASE,
  });
  assert.deepEqual(noKey.answer, {status: 500, body: 'Not configured'});
  assert.equal(noKey.requests.length, 0);
  assert.deepEqual(noKey.lines, [
    `${NEEDS_ATTENTION}not sent, PRODIGI_API_KEY is not set in the Oxygen environment (attempt 12 min after the event)`,
  ]);

  const noSecret = await deliver(caseOrder(), {
    PRODIGI_API_KEY: 'key',
    PRODIGI_API_BASE: PRODIGI_LIVE_BASE,
  });
  assert.deepEqual(noSecret.answer, {status: 500, body: 'Not configured'});
  assert.equal(noSecret.requests.length, 0);
  assert.deepEqual(noSecret.lines, [
    `${NEEDS_ATTENTION}not sent, SKY_SIGNING_SECRET is not set in the Oxygen environment (attempt 12 min after the event)`,
  ]);
});

test('an order the lab rejects, or that cannot be built, is acknowledged with the line', async () => {
  const rejected = await deliver(caseOrder(), LIVE, () =>
    json(400, {
      outcome: 'ValidationFailed',
      failures: {
        'recipient.address.postalOrZipCode': [
          {code: 'InvalidValue', providedValue: '10563'},
        ],
      },
    }),
  );
  assert.deepEqual(rejected.answer, {status: 200, body: 'Needs attention'});
  assert.deepEqual(rejected.lines, [
    `${NEEDS_ATTENTION}Prodigi rejected the order: status 400, outcome ValidationFailed, failures recipient.address.postalOrZipCode (InvalidValue)`,
  ]);

  const noAddress = await deliver(caseOrder({shipping_address: null}), LIVE);
  assert.deepEqual(noAddress.answer, {status: 200, body: 'Needs attention'});
  assert.equal(noAddress.requests.length, 0);
  assert.deepEqual(noAddress.lines, [
    `${NEEDS_ATTENTION}Missing shipping address.`,
  ]);
});

test('an order with nothing for this integration is acknowledged without a line', async () => {
  assert.equal(orderHasProdigiApiLines(printOrder()), false);
  assert.equal(orderHasProdigiApiLines(caseOrder()), true);
  // A personalised SKU without its personalisation is still ours to flag.
  assert.equal(
    orderHasProdigiApiLines(
      order([{id: 1, sku: 'CM-SKY-20X24-BLK', quantity: 1, properties: []}]),
    ),
    true,
  );

  // Even with nothing configured: such an order is no reason to fail the
  // delivery, and failing deliveries are what makes Shopify drop a webhook.
  for (const env of [LIVE, {}]) {
    const {answer, requests, lines} = await deliver(printOrder(), env);
    assert.deepEqual(answer, {
      status: 200,
      body: 'No lines for the Prodigi API',
    });
    assert.equal(requests.length, 0);
    assert.deepEqual(lines, []);
  }
});

test('the route hands verified orders to handlePaidOrder and the replay script keeps the test-order rule', () => {
  const route = readFileSync(
    new URL('../app/routes/webhooks.orders-paid.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(route.includes('await handlePaidOrder(order, {'));
  assert.ok(
    route.includes("triggeredAt: request.headers.get('X-Shopify-Triggered-At')"),
  );
  // Shopify's current policy; the old comment said 19 times over 48 hours.
  assert.ok(route.includes('8 times over the next 4 hours'));
  assert.ok(!route.includes('19 times'));

  const replay = readFileSync(
    new URL('./sky-replay-order.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(replay.includes('legacyResourceId name test email phone'));
  assert.ok(replay.includes('test: node.test,'));
  assert.ok(replay.includes('if (isTestOrderForLiveLab(order, prodigi)) {'));
});
