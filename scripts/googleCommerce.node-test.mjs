import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  getLocaleFromRequest,
  getMarketVaryHeader,
  MARKET_COUNTRIES,
  normalizeMarketCountry,
  resolveMarketCountry,
} from '../app/lib/markets.ts';
import {
  applyMarketSelection,
  processMarketSelectionRequest,
} from '../app/lib/markets.server.ts';
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

// Hydrogen cart mutations use a minimal fragment by default. Verify the
// persisted buyer identity with the full cart query before saving the market.
let readbackCalls = 0;
const minimalMutationSessionValues = new Map();
const minimalMutationSelection = await applyMarketSelection({
  cart: {
    async get() {
      readbackCalls += 1;
      return {
        buyerIdentity: {countryCode: 'DE'},
        id: 'gid://shopify/Cart/minimal',
      };
    },
    async updateBuyerIdentity() {
      return {cart: {id: 'gid://shopify/Cart/minimal'}};
    },
  },
  country: 'DE',
  session: {
    set: (key, value) => minimalMutationSessionValues.set(key, value),
  },
});
assert.equal(minimalMutationSelection.ok, true);
assert.equal(readbackCalls, 1);
assert.equal(minimalMutationSessionValues.get('marketCountry'), 'DE');
assert.equal(
  minimalMutationSelection.result.cart?.buyerIdentity?.countryCode,
  'DE',
);

const mismatchedReadbackSelection = await applyMarketSelection({
  cart: {
    async get() {
      return {
        buyerIdentity: {countryCode: 'CY'},
        id: 'gid://shopify/Cart/mismatched-readback',
      };
    },
    async updateBuyerIdentity() {
      return {cart: {id: 'gid://shopify/Cart/mismatched-readback'}};
    },
  },
  country: 'DE',
  session: {
    set: () => assert.fail('mismatched readback must not persist a market'),
  },
});
assert.equal(mismatchedReadbackSelection.ok, false);
assert.equal(mismatchedReadbackSelection.status, 422);

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

const userErrorSelection = await applyMarketSelection({
  cart: {
    async updateBuyerIdentity() {
      return {
        cart: {
          buyerIdentity: {countryCode: 'GB'},
          id: 'gid://shopify/Cart/3',
        },
        userErrors: [{field: ['buyerIdentity'], message: 'Market unavailable'}],
      };
    },
  },
  country: 'GB',
  session: {set: () => assert.fail('mutation user errors must not persist')},
});
assert.equal(userErrorSelection.ok, false);
assert.equal(userErrorSelection.status, 422);

const actionSessionValues = new Map();
let sessionCommitted = false;
const marketActionResult = await processMarketSelectionRequest({
  availableCountries: ['CY', 'US'],
  cart: {
    async updateBuyerIdentity(input) {
      return {
        cart: {
          buyerIdentity: {countryCode: input.countryCode},
          id: 'gid://shopify/Cart/action',
        },
      };
    },
    setCartId(cartId) {
      assert.equal(cartId, 'gid://shopify/Cart/action');
      return new Headers({'Set-Cookie': 'cart=action; Path=/; HttpOnly'});
    },
  },
  request: new Request('https://shopclaramendes.com/locale', {
    body: new URLSearchParams({
      country: 'US',
      redirectTo: '/products/quiet-form-i?size=large#details',
    }),
    method: 'POST',
  }),
  session: {
    async commit() {
      sessionCommitted = true;
      return 'market=US; Path=/; HttpOnly';
    },
    set(key, value) {
      actionSessionValues.set(key, value);
    },
  },
});
assert.equal(marketActionResult.ok, true);
assert.equal(
  marketActionResult.destination,
  '/products/quiet-form-i?size=large#details',
);
assert.equal(marketActionResult.status, 303);
assert.equal(actionSessionValues.get('marketCountry'), 'US');
assert.equal(sessionCommitted, true);
assert.match(marketActionResult.headers.get('set-cookie') ?? '', /cart=action/);
assert.match(marketActionResult.headers.get('set-cookie') ?? '', /market=US/);

let failedActionCommitted = false;
const failedMarketAction = await processMarketSelectionRequest({
  availableCountries: ['CY', 'US'],
  cart: {
    async updateBuyerIdentity() {
      assert.fail('invalid country must not update buyer identity');
    },
    setCartId() {
      assert.fail('failed market action must not write a cart cookie');
    },
  },
  request: new Request('https://shopclaramendes.com/locale', {
    body: new URLSearchParams({country: 'CA', redirectTo: '//evil.example'}),
    method: 'POST',
  }),
  session: {
    async commit() {
      failedActionCommitted = true;
      return '';
    },
    set() {
      assert.fail('invalid country must not persist a market');
    },
  },
});
assert.equal(failedMarketAction.ok, false);
assert.equal(failedMarketAction.status, 400);
assert.equal(failedActionCommitted, false);

let unavailableMarketUpdated = false;
const unavailableMarketAction = await processMarketSelectionRequest({
  availableCountries: ['CY', 'US'],
  cart: {
    async updateBuyerIdentity() {
      unavailableMarketUpdated = true;
      return {cart: null};
    },
    setCartId() {
      assert.fail('unavailable market must not write a cart cookie');
    },
  },
  request: new Request('https://shopclaramendes.com/locale', {
    body: new URLSearchParams({country: 'GB', redirectTo: '/'}),
    method: 'POST',
  }),
  session: {
    async commit() {
      assert.fail('unavailable market must not write a session cookie');
    },
    set() {
      assert.fail('unavailable market must not persist a session');
    },
  },
});
assert.equal(unavailableMarketAction.ok, false);
assert.equal(unavailableMarketAction.status, 422);
assert.equal(unavailableMarketUpdated, false);

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
const marketingCheckoutUrlSource = await readFile(
  new URL('../app/hooks/useMarketingCheckoutUrl.ts', import.meta.url),
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
const allCollectionSource = await readFile(
  new URL('../app/routes/collections.all.tsx', import.meta.url),
  'utf8',
);
const handleCollectionSource = await readFile(
  new URL('../app/routes/collections.$handle.tsx', import.meta.url),
  'utf8',
);
assert.ok(!addToCartSource.includes('sendAdPlatformCommerceEvent'));
assert.ok(!productRouteSource.includes('AdPlatformProductView'));
assert.match(addToCartSource, /useMarketingConsent/);
assert.match(cartSummarySource, /useMarketingCheckoutUrl/);
assert.match(marketingCheckoutUrlSource, /consent !== 'granted'/);
assert.match(attributionSource, /clearMarketingAttribution/);
assert.match(allCollectionSource, /<Analytics\.CollectionView/);
assert.match(handleCollectionSource, /<Analytics\.CollectionView/);
assert.ok(
  !rootSource.includes('cookieDomain='),
  'Hydrogen Analytics.Provider must not receive a cookieDomain prop; Google cross-domain linking belongs in the optional GTM bridge',
);
