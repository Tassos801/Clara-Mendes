import assert from 'node:assert/strict';
import test from 'node:test';

import {removeMarketingCartAttributes} from '../app/lib/marketingAttribution.ts';

test('preserves unrelated cart attributes byte-for-byte during revocation', () => {
  const unrelated = {
    key: 'app.note:v1',
    value: '  Keep  spacing\nand punctuation: ✓  ',
  };

  assert.deepEqual(
    removeMarketingCartAttributes([
      {key: 'gclid', value: 'paid-click'},
      unrelated,
    ]),
    [unrelated],
  );
});

test('keeps marketing consent unknown until Shopify resolves it', async () => {
  const consent = await import('../app/lib/marketingConsent.ts').catch(
    () => ({}),
  );

  assert.equal(
    typeof consent.marketingConsentStateFromCustomerPrivacy,
    'function',
  );
  assert.equal(
    consent.marketingConsentStateFromCustomerPrivacy(null),
    'unknown',
  );
  assert.equal(
    consent.marketingConsentStateFromCustomerPrivacy({
      marketingAllowed: () => true,
    }),
    'granted',
  );
  assert.equal(
    consent.marketingConsentStateFromCustomerPrivacy({
      marketingAllowed: () => false,
    }),
    'denied',
  );
});

test('does not read or erase attribution while consent is unknown', async () => {
  const attribution = await import('../app/lib/marketingAttribution.ts');

  assert.equal(
    typeof attribution.marketingAttributionValueForConsent,
    'function',
  );
  let serializations = 0;
  const serialize = () => {
    serializations += 1;
    return 'paid-attribution';
  };

  assert.equal(
    attribution.marketingAttributionValueForConsent('unknown', serialize),
    '',
  );
  assert.equal(
    attribution.marketingAttributionValueForConsent('denied', serialize),
    '',
  );
  assert.equal(serializations, 0);
  assert.equal(
    attribution.marketingAttributionValueForConsent('granted', serialize),
    'paid-attribution',
  );
  assert.equal(serializations, 1);
});

test('rejects HTTP 200 cleanup responses with user errors or stale attributes', async () => {
  const attribution = await import('../app/lib/marketingAttribution.ts');

  assert.equal(
    typeof attribution.isMarketingCartCleanupResponseSuccessful,
    'function',
  );
  assert.equal(
    attribution.isMarketingCartCleanupResponseSuccessful(true, {
      cart: {attributes: [{key: 'gift_note', value: 'Keep'}]},
      userErrors: [{field: ['attributes'], message: 'Rejected'}],
    }),
    false,
  );
  assert.equal(
    attribution.isMarketingCartCleanupResponseSuccessful(true, {
      cart: {attributes: [{key: 'gclid', value: 'still-present'}]},
    }),
    false,
  );
  assert.equal(
    attribution.isMarketingCartCleanupResponseSuccessful(true, {
      cart: {attributes: [{key: 'gift_note', value: 'Keep'}]},
    }),
    true,
  );
});

test('subscription privacy reader uses the latest Shopify permissions', async () => {
  const commerce = await import('../app/lib/googleCommerce.ts');

  assert.equal(typeof commerce.createGoogleCommercePrivacyReader, 'function');
  const privacy = commerce.createGoogleCommercePrivacyReader();
  privacy.update(null, () => false);
  assert.deepEqual(privacy.current(), {
    analyticsAllowed: false,
    canTrack: false,
    marketingAllowed: false,
  });

  privacy.update(
    {
      analyticsProcessingAllowed: () => true,
      marketingAllowed: () => true,
    },
    () => true,
  );
  assert.deepEqual(privacy.current(), {
    analyticsAllowed: true,
    canTrack: true,
    marketingAllowed: true,
  });
});
