import assert from 'node:assert/strict';
import test from 'node:test';
import {
  __resetAdminTokenCacheForTests,
  getAdminAccessToken,
} from '../app/lib/adminToken.server.ts';
import {
  createAdminClient,
  ReviewsNotConfiguredError,
} from '../app/lib/reviews.server.ts';
import {subscribeEmail} from '../app/lib/newsletter.server.ts';

const FAKE_SECRET = 'fake-secret-do-not-log';
const credentials = {
  PUBLIC_STORE_DOMAIN: 'fake-store.myshopify.com',
  SHOPIFY_CLIENT_ID: 'fake-client-id',
  SHOPIFY_CLIENT_SECRET: FAKE_SECRET,
};

function fakeFetch(replies) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({url, init});
    const reply = replies.shift();
    if (!reply) throw new Error('unexpected token exchange');
    return new Response(JSON.stringify(reply.body), {status: reply.status ?? 200});
  };
  return {calls, fetchImpl};
}

const grant = (token, expiresIn = 86399) => ({
  body: {access_token: token, expires_in: expiresIn, scope: 'write_customers'},
});

test.beforeEach(() => __resetAdminTokenCacheForTests());

test('a static token wins over client credentials', async () => {
  const {calls, fetchImpl} = fakeFetch([]);
  const token = await getAdminAccessToken(
    {...credentials, SHOPIFY_ADMIN_ACCESS_TOKEN: 'fake-static-token'},
    fetchImpl,
  );
  assert.equal(token, 'fake-static-token');
  assert.equal(calls.length, 0);
});

test('client credentials are exchanged once, then cached', async () => {
  const {calls, fetchImpl} = fakeFetch([grant('fake-token-1')]);
  assert.equal(await getAdminAccessToken(credentials, fetchImpl), 'fake-token-1');
  assert.equal(await getAdminAccessToken(credentials, fetchImpl), 'fake-token-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://fake-store.myshopify.com/admin/oauth/access_token');
  assert.equal(calls[0].init.method, 'POST');
  const form = new URLSearchParams(calls[0].init.body);
  assert.equal(form.get('client_id'), 'fake-client-id');
  assert.equal(form.get('client_secret'), FAKE_SECRET);
  assert.equal(form.get('grant_type'), 'client_credentials');
});

test('the token is re-exchanged five minutes before it expires', async () => {
  let clock = 1_000_000;
  const now = () => clock;
  const {calls, fetchImpl} = fakeFetch([grant('fake-token-1', 3600), grant('fake-token-2', 3600)]);
  assert.equal(await getAdminAccessToken(credentials, fetchImpl, now), 'fake-token-1');
  clock += (3600 - 300 - 1) * 1000;
  assert.equal(await getAdminAccessToken(credentials, fetchImpl, now), 'fake-token-1');
  clock += 1000;
  assert.equal(await getAdminAccessToken(credentials, fetchImpl, now), 'fake-token-2');
  assert.equal(calls.length, 2);
});

test('concurrent callers each get a token without sharing a promise', async () => {
  const {calls, fetchImpl} = fakeFetch(Array.from({length: 5}, () => grant('fake-token-1')));
  const tokens = await Promise.all(
    Array.from({length: 5}, () => getAdminAccessToken(credentials, fetchImpl)),
  );
  assert.deepEqual(tokens, Array(5).fill('fake-token-1'));
  assert.ok(calls.length >= 1 && calls.length <= 5, `${calls.length} exchanges`);
  // Once they have landed, later callers use the cache.
  const exchanges = calls.length;
  assert.equal(await getAdminAccessToken(credentials, fetchImpl), 'fake-token-1');
  assert.equal(calls.length, exchanges);
});

test('the exchange carries a timeout signal', async () => {
  const {calls, fetchImpl} = fakeFetch([grant('fake-token-1')]);
  await getAdminAccessToken(credentials, fetchImpl);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('an unusable expires_in caches for half of it, at least 60 s', async () => {
  for (const [expiresIn, seconds] of [[undefined, 60], ['soon', 60], [100, 60], [300, 150], [0, 60]]) {
    __resetAdminTokenCacheForTests();
    let clock = 5_000_000;
    const now = () => clock;
    const {calls, fetchImpl} = fakeFetch([
      {body: {access_token: 'fake-token-a', ...(expiresIn === undefined ? {} : {expires_in: expiresIn})}},
      grant('fake-token-b'),
    ]);
    await getAdminAccessToken(credentials, fetchImpl, now);
    clock += (seconds - 1) * 1000;
    assert.equal(await getAdminAccessToken(credentials, fetchImpl, now), 'fake-token-a', String(expiresIn));
    clock += 1000;
    assert.equal(await getAdminAccessToken(credentials, fetchImpl, now), 'fake-token-b', String(expiresIn));
    assert.equal(calls.length, 2);
  }
});

test('a rejected exchange throws with the status and error, never the secret', async () => {
  const {fetchImpl} = fakeFetch([
    {status: 401, body: {error: 'invalid_client', error_description: 'Client authentication failed'}},
    grant('fake-token-after-retry'),
  ]);
  await assert.rejects(
    () => getAdminAccessToken(credentials, fetchImpl),
    (error) => {
      assert.ok(!(error instanceof ReviewsNotConfiguredError));
      assert.match(error.message, /401/);
      assert.match(error.message, /invalid_client/);
      assert.match(error.message, /Client authentication failed/);
      assert.ok(!error.message.includes(FAKE_SECRET));
      return true;
    },
  );
  // A failure is not cached: the next call tries again.
  assert.equal(await getAdminAccessToken(credentials, fetchImpl), 'fake-token-after-retry');
});

test('nothing configured throws ReviewsNotConfiguredError', async () => {
  const {fetchImpl} = fakeFetch([]);
  await assert.rejects(
    () => getAdminAccessToken({PUBLIC_STORE_DOMAIN: 'fake-store.myshopify.com'}, fetchImpl),
    ReviewsNotConfiguredError,
  );
  await assert.rejects(
    () => getAdminAccessToken({PUBLIC_STORE_DOMAIN: 'fake-store.myshopify.com', SHOPIFY_CLIENT_ID: 'fake-client-id'}, fetchImpl),
    ReviewsNotConfiguredError,
  );
});

test('createAdminClient accepts client credentials and throws only when unconfigured', () => {
  assert.equal(typeof createAdminClient(credentials), 'function');
  assert.throws(() => createAdminClient({PUBLIC_STORE_DOMAIN: 'fake-store.myshopify.com'}), ReviewsNotConfiguredError);
  assert.throws(
    () => createAdminClient({SHOPIFY_CLIENT_ID: 'fake-client-id', SHOPIFY_CLIENT_SECRET: FAKE_SECRET}),
    ReviewsNotConfiguredError,
  );
});

test('a failed exchange at request time is an error for the newsletter, not "disabled"', async (t) => {
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return new Response(JSON.stringify({error: 'invalid_client'}), {status: 401});
  };
  await assert.rejects(
    () => subscribeEmail(credentials, {email: 'a@b.co'}),
    (error) => {
      assert.ok(!(error instanceof ReviewsNotConfiguredError));
      assert.match(error.message, /401/);
      assert.ok(!error.message.includes(FAKE_SECRET));
      return true;
    },
  );
  assert.deepEqual(urls, ['https://fake-store.myshopify.com/admin/oauth/access_token']);
});

test('the Admin client sends the minted token on each request', async (t) => {
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  const sent = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/admin/oauth/access_token')) {
      return new Response(JSON.stringify(grant('fake-minted-token').body));
    }
    sent.push({url: String(url), token: init.headers['X-Shopify-Access-Token']});
    return new Response(JSON.stringify({data: {ok: true}}));
  };
  const admin = createAdminClient(credentials);
  assert.deepEqual(await admin('{ shop { id } }'), {ok: true});
  await admin('{ shop { id } }');
  assert.deepEqual(sent, [
    {url: 'https://fake-store.myshopify.com/admin/api/2026-07/graphql.json', token: 'fake-minted-token'},
    {url: 'https://fake-store.myshopify.com/admin/api/2026-07/graphql.json', token: 'fake-minted-token'},
  ]);
});
