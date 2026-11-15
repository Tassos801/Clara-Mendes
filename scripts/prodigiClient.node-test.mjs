import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProdigiClient,
  PRODIGI_TIMEOUT_STATUS,
  ProdigiRequestError,
  summarizeProdigiError,
} from '../app/lib/prodigi.server.ts';

test('error summaries keep status, outcome, fields and codes but never values', () => {
  const summary = summarizeProdigiError(400, {
    outcome: 'ValidationFailed',
    failures: {
      'recipient.address.postalOrZipCode': [
        {code: 'InvalidValue', providedValue: '1234 Secret Street'},
      ],
      'recipient.email': [{code: 'InvalidFormat', providedValue: 'buyer@example.com'}],
    },
  });
  assert.match(summary, /status 400/);
  assert.match(summary, /ValidationFailed/);
  assert.match(summary, /recipient\.address\.postalOrZipCode \(InvalidValue\)/);
  assert.doesNotMatch(summary, /Secret Street|buyer@example\.com/);
  assert.equal(summarizeProdigiError(502, null), 'status 502');
});

test('a request that outlives timeoutMs becomes a retryable 504 ProdigiRequestError', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
  try {
    const prodigi = createProdigiClient({PRODIGI_API_KEY: 'test'}, {timeoutMs: 20});
    await assert.rejects(prodigi.getOrder('ord_1'), (error) => {
      assert.ok(error instanceof ProdigiRequestError);
      assert.equal(error.status, PRODIGI_TIMEOUT_STATUS);
      return true;
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});
