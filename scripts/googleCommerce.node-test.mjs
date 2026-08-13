import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  getLocaleFromRequest,
  getMarketVaryHeader,
  MARKET_COUNTRIES,
  normalizeMarketCountry,
  resolveMarketCountry,
} from '../app/lib/markets.ts';
import {applyMarketSelection} from '../app/lib/markets.server.ts';
import {
  consentModeFromShopify,
  DENIED_CONSENT_MODE,
  ecommerceValue,
  normalizeGoogleCommerceItem,
  normalizeGtmContainerId,
  pruneAndRecordDedupeEntries,
  shouldEmitGoogleCommerceEvent,
} from '../app/lib/googleCommerce.ts';
import {
  POLICY_HANDLES,
  POLICY_META_DESCRIPTIONS,
  policyCanonicalPath,
} from '../app/lib/policyMetadata.ts';
import {robotsTxtData} from '../app/lib/robots.ts';

const request = (country) =>
  new Request('https://shopclaramendes.com/products/quiet-form-i-art-print', {
    headers: country ? {'oxygen-buyer-country': country} : {},
  });

// An explicit, validated selection always wins; geolocation is next and
// Cyprus is the deterministic local-development/unsupported-country fallback.
assert.equal(
  resolveMarketCountry({explicitCountry: 'gb', oxygenCountry: 'DE'}),
  'GB',
);
assert.equal(resolveMarketCountry({oxygenCountry: 'de'}), 'DE');
assert.equal(resolveMarketCountry({oxygenCountry: 'CA'}), 'CY');
assert.equal(resolveMarketCountry({}), 'CY');
assert.equal(getLocaleFromRequest(request('US'), 'FR').country, 'FR');
assert.equal(getLocaleFromRequest(request('GB')).country, 'GB');
assert.equal(normalizeMarketCountry(' uk '), null);
assert.ok(
  MARKET_COUNTRIES.some(
    ({code, currency}) => code === 'GB' && currency === 'GBP',
  ),
  'United Kingdom market missing',
);
assert.equal(
  getMarketVaryHeader('Accept-Encoding'),
  'Accept-Encoding, Cookie, oxygen-buyer-country',
);

// Changing the market must update checkout buyer identity before persistence.
const calls = [];
const sessionValues = new Map();
const selected = await applyMarketSelection({
  cart: {
    async updateBuyerIdentity(input) {
      calls.push(input);
      return {
        cart: {
          buyerIdentity: {countryCode: 'GB'},
          id: 'gid://shopify/Cart/1',
        },
        errors: [],
        warnings: [],
      };
    },
  },
  country: 'gb',
  session: {set: (key, value) => sessionValues.set(key, value)},
});
assert.equal(selected.ok, true);
assert.deepEqual(calls, [{countryCode: 'GB'}]);
assert.equal(sessionValues.get('marketCountry'), 'GB');

let invalidCartCalled = false;
const invalidSelection = await applyMarketSelection({
  cart: {
    async updateBuyerIdentity() {
      invalidCartCalled = true;
      return {cart: null};
    },
  },
  country: 'CA',
  session: {set: () => assert.fail('invalid market must not be persisted')},
});
assert.equal(invalidSelection.ok, false);
assert.equal(invalidSelection.status, 400);
assert.equal(invalidCartCalled, false);

const unappliedSelection = await applyMarketSelection({
  cart: {
    async updateBuyerIdentity() {
      return {
        cart: {
          buyerIdentity: {countryCode: 'CY'},
          id: 'gid://shopify/Cart/2',
        },
      };
    },
  },
  country: 'GB',
  session: {set: () => assert.fail('unapplied market must not be persisted')},
});
assert.equal(unappliedSelection.ok, false);
assert.equal(unappliedSelection.status, 422);

// Consent Mode remains denied until Shopify Customer Privacy grants each
// category. Commerce data is emitted only when both privacy checks agree.
assert.equal(DENIED_CONSENT_MODE.analytics_storage, 'denied');
assert.equal(DENIED_CONSENT_MODE.ad_user_data, 'denied');
assert.deepEqual(
  consentModeFromShopify({
    analyticsAllowed: true,
    marketingAllowed: false,
    preferencesAllowed: true,
  }),
  {
    ad_personalization: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    personalization_storage: 'granted',
    security_storage: 'granted',
  },
);
assert.equal(
  shouldEmitGoogleCommerceEvent({
    analyticsAllowed: true,
    canTrack: false,
  }),
  false,
);
assert.equal(
  shouldEmitGoogleCommerceEvent({analyticsAllowed: true, canTrack: true}),
  true,
);

assert.equal(normalizeGtmContainerId(' gtm-ab12cd '), 'GTM-AB12CD');
assert.equal(normalizeGtmContainerId('G-AB12CD'), null);
const commerceItem = normalizeGoogleCommerceItem({
  brand: 'Clara Mendes',
  category: 'Art print',
  name: 'Quiet Form I',
  price: {amount: '24.995'},
  productGid: 'gid://shopify/Product/100',
  quantity: 2,
  sku: 'CM-QF1-8X10',
  variantGid: 'gid://shopify/ProductVariant/200',
  variantName: '8 x 10 in',
});
assert.equal(commerceItem?.item_id, 'CM-QF1-8X10');
assert.equal(commerceItem?.price, 25);
assert.equal(ecommerceValue([commerceItem]), 50);

const firstDedupe = pruneAndRecordDedupeEntries({}, 'view_item:200', 1000);
assert.equal(firstDedupe.duplicate, false);
assert.equal(
  pruneAndRecordDedupeEntries(firstDedupe.entries, 'view_item:200', 1500)
    .duplicate,
  true,
);
assert.equal(
  pruneAndRecordDedupeEntries(firstDedupe.entries, 'view_item:200', 4001)
    .duplicate,
  false,
);

const robots = robotsTxtData({url: 'https://shopclaramendes.com'});
assert.match(robots, /User-agent: Googlebot\n/);
assert.match(robots, /User-agent: Googlebot-Image\nAllow: \//);
assert.ok(!robots.includes('Disallow: /policies/'));
assert.match(robots, /Sitemap: https:\/\/shopclaramendes\.com\/sitemap\.xml/);

for (const handle of POLICY_HANDLES) {
  assert.equal(policyCanonicalPath(handle), `/policies/${handle}`);
}
assert.equal(policyCanonicalPath('made-up-policy'), null);
for (const description of Object.values(POLICY_META_DESCRIPTIONS)) {
  assert.ok(description.length >= 50, 'policy description is too thin');
  assert.ok(description.length <= 155, 'policy description is too long');
}

// Native Google & YouTube remains the only checkout/purchase source. This
// optional Hydrogen bridge subscribes once to storefront events only, with no
// dormant Meta/TikTok calls or direct add-to-cart/product dispatch path.
const analyticsSource = await readFile(
  new URL('../app/components/GoogleCommerceAnalytics.tsx', import.meta.url),
  'utf8',
);
assert.ok(!analyticsSource.includes("event: 'purchase'"));
assert.ok(!analyticsSource.includes("event: 'begin_checkout'"));
assert.ok(!analyticsSource.includes('fbq'));
assert.ok(!analyticsSource.includes('ttq'));
assert.equal(
  (analyticsSource.match(/subscribe\(AnalyticsEvent\.PRODUCT_VIEWED/g) ?? [])
    .length,
  1,
);
assert.equal(
  (
    analyticsSource.match(/subscribe\(AnalyticsEvent\.PRODUCT_ADD_TO_CART/g) ??
    []
  ).length,
  1,
);

const addToCartSource = await readFile(
  new URL('../app/components/AddToCartButton.tsx', import.meta.url),
  'utf8',
);
const productRouteSource = await readFile(
  new URL('../app/routes/products.$handle.tsx', import.meta.url),
  'utf8',
);
const cartSummarySource = await readFile(
  new URL('../app/components/CartSummary.tsx', import.meta.url),
  'utf8',
);
const attributionSource = await readFile(
  new URL('../app/components/MarketingAttribution.tsx', import.meta.url),
  'utf8',
);
const rootSource = await readFile(
  new URL('../app/root.tsx', import.meta.url),
  'utf8',
);
assert.ok(!addToCartSource.includes('sendAdPlatformCommerceEvent'));
assert.ok(!productRouteSource.includes('AdPlatformProductView'));
assert.match(addToCartSource, /canTrack\(\)/);
assert.match(cartSummarySource, /checkoutUrl && canTrack\(\)/);
assert.match(attributionSource, /if \(canTrack\(\)\)/);
assert.ok(
  !rootSource.includes('cookieDomain='),
  'Hydrogen Analytics.Provider must not receive a cookieDomain prop; Google cross-domain linking belongs in the optional GTM bridge',
);
