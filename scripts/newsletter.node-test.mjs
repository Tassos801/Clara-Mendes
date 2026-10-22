import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConsentInput,
  isValidEmail,
  NEWSLETTER_HONEYPOT_FIELD,
  normalizeEmail,
} from '../app/lib/newsletter.ts';
import {subscribeEmail} from '../app/lib/newsletter.server.ts';
import {ReviewsNotConfiguredError} from '../app/lib/reviews.server.ts';

test('emails are trimmed and lower-cased, then validated', () => {
  assert.equal(normalizeEmail('  Ana@Example.COM '), 'ana@example.com');
  assert.equal(NEWSLETTER_HONEYPOT_FIELD, 'website');
  for (const ok of ['a@b.co', 'first.last+tag@sub.example.org'])
    assert.equal(isValidEmail(ok), true, ok);
  for (const bad of ['', 'ab.co', 'a@b', 'a b@c.co', 'a@@b.co', `${'x'.repeat(250)}@b.co`])
    assert.equal(isValidEmail(bad), false, bad || '(empty)');
});

test('the consent input subscribes with single opt-in and a timestamp', () => {
  const input = buildConsentInput(new Date('2026-10-22T10:00:00Z'));
  assert.deepEqual(input, {
    marketingState: 'SUBSCRIBED',
    marketingOptInLevel: 'SINGLE_OPT_IN',
    consentUpdatedAt: '2026-10-22T10:00:00.000Z',
  });
});

function fakeClient(script) {
  const calls = [];
  const client = async (query, variables) => {
    calls.push({query, variables});
    const step = script.shift();
    if (!step) throw new Error(`unexpected call: ${query.slice(0, 40)}`);
    if (step instanceof Error) throw step;
    return step;
  };
  return {calls, client};
}

const env = {SHOPIFY_ADMIN_ACCESS_TOKEN: 't', PUBLIC_STORE_DOMAIN: 'x.myshopify.com'};

test('a new address is created as a subscribed customer', async () => {
  const {calls, client} = fakeClient([
    {customerCreate: {customer: {id: 'gid://shopify/Customer/1'}, userErrors: []}},
  ]);
  const result = await subscribeEmail(env, {email: 'New@Example.com'}, {client});
  assert.equal(result.status, 'subscribed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].variables.input.email, 'new@example.com');
  assert.deepEqual(calls[0].variables.input.tags, ['newsletter', 'source:storefront']);
  assert.equal(calls[0].variables.input.emailMarketingConsent.marketingState, 'SUBSCRIBED');
});

test('an existing address gets its consent updated', async () => {
  const {calls, client} = fakeClient([
    {customerCreate: {customer: null, userErrors: [{field: ['input', 'email'], message: 'Email has already been taken'}]}},
    {customers: {nodes: [{id: 'gid://shopify/Customer/9', emailMarketingConsent: {marketingState: 'NOT_SUBSCRIBED'}}]}},
    {customerEmailMarketingConsentUpdate: {customer: {id: 'gid://shopify/Customer/9'}, userErrors: []}},
  ]);
  const result = await subscribeEmail(env, {email: 'old@example.com'}, {client});
  assert.equal(result.status, 'subscribed');
  assert.equal(calls.length, 3);
  assert.equal(calls[2].variables.input.customerId, 'gid://shopify/Customer/9');
});

test('an address that is already subscribed is reported as such', async () => {
  const {client} = fakeClient([
    {customerCreate: {customer: null, userErrors: [{field: ['input', 'email'], message: 'Email has already been taken'}]}},
    {customers: {nodes: [{id: 'gid://shopify/Customer/9', emailMarketingConsent: {marketingState: 'SUBSCRIBED'}}]}},
  ]);
  const result = await subscribeEmail(env, {email: 'old@example.com'}, {client});
  assert.equal(result.status, 'already');
});

test('other user errors and access problems throw', async () => {
  const denied = fakeClient([new Error('Admin API request failed: ACCESS_DENIED')]);
  await assert.rejects(() => subscribeEmail(env, {email: 'a@b.co'}, {client: denied.client}), /ACCESS_DENIED/);
  const invalid = fakeClient([
    {customerCreate: {customer: null, userErrors: [{field: ['input', 'email'], message: 'Email is invalid'}]}},
  ]);
  await assert.rejects(() => subscribeEmail(env, {email: 'a@b.co'}, {client: invalid.client}), /invalid/);
});

test('without an admin token the feature reports itself disabled', async () => {
  const result = await subscribeEmail({PUBLIC_STORE_DOMAIN: 'x.myshopify.com'}, {email: 'a@b.co'});
  assert.equal(result.status, 'disabled');
  assert.ok(new ReviewsNotConfiguredError() instanceof Error);
});
