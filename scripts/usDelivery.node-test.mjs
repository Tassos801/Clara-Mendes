import assert from 'node:assert/strict';
import test from 'node:test';

import {YOUR_SKY_PAGE} from '../app/lib/featurePages.ts';
import {
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
  DELIVERY_US_BUSINESS_DAYS,
  readsUsDelivery,
} from '../app/lib/storefrontBasics.ts';

// docs/us-market/status.md, step A2: US buyers read Prodigi's US window;
// every other buyer keeps the EU + elsewhere wording unchanged.
test('the US window is Prodigi’s US estimate and the others are unchanged', () => {
  assert.equal(DELIVERY_US_BUSINESS_DAYS, '7–15');
  assert.equal(DELIVERY_EU_BUSINESS_DAYS, '5–10');
  assert.equal(DELIVERY_INTERNATIONAL_BUSINESS_DAYS, '7–20');
});

test('only US buyers of items that reach them read the US window', () => {
  assert.equal(readsUsDelivery({buyerCountry: 'US'}), true);
  assert.equal(readsUsDelivery({buyerCountry: ' us '}), true);
  for (const country of ['CY', 'DE', 'CA', 'JP', 'GB', '', null, undefined]) {
    assert.equal(readsUsDelivery({buyerCountry: country}), false, String(country));
  }
  // Out of reach (framed, cards, pots): keep the generic wording.
  assert.equal(readsUsDelivery({buyerCountry: 'US', shipsToBuyer: false}), false);
  // Printful activewear: US transit not verified yet.
  assert.equal(readsUsDelivery({buyerCountry: 'US', isApparel: true}), false);
});

test('Your Sky keeps its EU wording and adds a US one', () => {
  const shipping = YOUR_SKY_PAGE.how.find((item) => item.usBody);
  assert.ok(shipping, 'Your Sky shipping item has a US body');
  assert.equal(
    shipping.body,
    'Each map is printed for you after checkout, dispatched in 2–4 business days and delivered across the EU in 5–10, elsewhere in 7–20. Framed maps ship outside the EU to selected countries; checkout confirms yours.',
  );
  assert.match(shipping.usBody, /within the US in 7–15\./);
  assert.match(shipping.usBody, /dispatched in 2–4 business days/);
});
