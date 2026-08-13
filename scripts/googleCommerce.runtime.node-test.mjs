import assert from 'node:assert/strict';
import {
  emitGoogleCommerceEvent,
  initializeGoogleTagManager,
  pushConsentMode,
} from '../app/lib/googleCommerce.client.ts';
import {consentModeFromShopify} from '../app/lib/googleCommerce.ts';
import {
  buildCheckoutUrlWithAttribution,
  captureMarketingAttribution,
  getSerializedMarketingAttribution,
  removeMarketingCartAttributes,
} from '../app/lib/marketingAttribution.ts';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
    values,
  };
}

let clock = 1_000;
const appendedScripts = [];
const runtimeStorage = createStorage();
const runtime = {
  document: {
    createElement() {
      return {async: false, dataset: {}, src: ''};
    },
    head: {
      appendChild(script) {
        appendedScripts.push(script);
      },
    },
  },
  now: () => clock,
  randomId: () => 'test-event',
  window: {dataLayer: [], sessionStorage: runtimeStorage},
};

// Consent defaults are queued before linker configuration, GTM startup, and
// script loading. Re-initialization is idempotent.
assert.equal(initializeGoogleTagManager('GTM-TEST123', runtime), true);
assert.deepEqual(runtime.window.dataLayer[0], [
  'consent',
  'default',
  {
    ad_personalization: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500,
  },
]);
assert.deepEqual(runtime.window.dataLayer[1], [
  'set',
  'linker',
  {
    accept_incoming: true,
    decorate_forms: true,
    domains: ['shopclaramendes.com', 'checkout.shopclaramendes.com'],
  },
]);
assert.deepEqual(runtime.window.dataLayer[2], {
  'gtm.start': 1_000,
  event: 'gtm.js',
});
assert.equal(appendedScripts.length, 1);
assert.equal(appendedScripts[0].dataset.claraGtm, 'GTM-TEST123');
assert.match(appendedScripts[0].src, /id=GTM-TEST123$/);
assert.equal(initializeGoogleTagManager('GTM-TEST123', runtime), true);
assert.equal(appendedScripts.length, 1);
assert.equal(runtime.window.dataLayer.length, 3);

pushConsentMode(
  'update',
  consentModeFromShopify({
    analyticsAllowed: true,
    marketingAllowed: false,
    preferencesAllowed: false,
  }),
  runtime,
);
assert.deepEqual(runtime.window.dataLayer.at(-1), [
  'consent',
  'update',
  {
    ad_personalization: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    analytics_storage: 'granted',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
  },
]);

const ecommerceParameters = {
  ecommerce: {
    currency: 'EUR',
    item_list_id: 'all',
    item_list_name: 'all',
    items: [
      {
        item_brand: 'Clara Mendes',
        item_id: 'CM-QF1-8X10',
        item_name: 'Quiet Form I',
        price: 25,
        quantity: 1,
      },
    ],
    value: 25,
  },
};
let attributionCaptures = 0;
const captureAttribution = () => {
  attributionCaptures += 1;
  return {
    version: 1,
    session_id: 'session',
    current_page: 'https://shopclaramendes.com/collections/all',
    first_touch: {
      captured_at: '',
      landing_page: 'https://shopclaramendes.com/collections/all?gclid=test',
      source: 'google',
    },
    last_touch: {
      captured_at: '',
      gclid: 'test',
      landing_page: 'https://shopclaramendes.com/collections/all?gclid=test',
      source: 'google',
    },
  };
};

// No commerce event is emitted before analytics permission. Analytics-only
// consent emits the exact GA4 ecommerce shape but never reads attribution.
const beforePermissionLength = runtime.window.dataLayer.length;
assert.equal(
  emitGoogleCommerceEvent({
    analyticsAllowed: false,
    canTrack: false,
    captureAttribution,
    dedupeKey: 'view_item_list:denied',
    event: 'view_item_list',
    marketingAllowed: false,
    parameters: ecommerceParameters,
    runtime,
    sourceEvent: 'collection_viewed',
  }),
  false,
);
assert.equal(runtime.window.dataLayer.length, beforePermissionLength);
assert.equal(attributionCaptures, 0);

assert.equal(
  emitGoogleCommerceEvent({
    analyticsAllowed: true,
    canTrack: true,
    captureAttribution,
    dedupeKey: 'view_item_list:allowed',
    event: 'view_item_list',
    marketingAllowed: false,
    parameters: ecommerceParameters,
    runtime,
    sourceEvent: 'collection_viewed',
  }),
  true,
);
assert.deepEqual(runtime.window.dataLayer.at(-2), {ecommerce: null});
assert.deepEqual(runtime.window.dataLayer.at(-1), {
  event: 'view_item_list',
  event_id: 'cm_view_item_list_1000_test-event',
  source_event: 'collection_viewed',
  ...ecommerceParameters,
});
assert.equal(attributionCaptures, 0);

// A duplicate Hydrogen callback is suppressed, while a distinct cart mutation
// inside the same two-second window is retained.
const afterFirstEventLength = runtime.window.dataLayer.length;
assert.equal(
  emitGoogleCommerceEvent({
    analyticsAllowed: true,
    canTrack: true,
    captureAttribution,
    dedupeKey: 'view_item_list:allowed',
    event: 'view_item_list',
    marketingAllowed: true,
    parameters: ecommerceParameters,
    runtime,
    sourceEvent: 'collection_viewed',
  }),
  false,
);
assert.equal(runtime.window.dataLayer.length, afterFirstEventLength);

assert.equal(
  emitGoogleCommerceEvent({
    analyticsAllowed: true,
    canTrack: true,
    captureAttribution,
    dedupeKey: 'add_to_cart:cart:updated-2:line:1:2',
    event: 'add_to_cart',
    marketingAllowed: true,
    parameters: ecommerceParameters,
    runtime,
    sourceEvent: 'product_added_to_cart',
  }),
  true,
);
assert.equal(attributionCaptures, 1);
assert.equal(runtime.window.dataLayer.at(-1).attribution.last_touch.gclid, 'test');

assert.deepEqual(
  removeMarketingCartAttributes([
    {key: 'gclid', value: 'paid-click'},
    {key: 'clara_session_id', value: 'marketing-session'},
    {key: 'gift_note', value: 'Keep this operational attribute'},
  ]),
  [{key: 'gift_note', value: 'Keep this operational attribute'}],
);

// Attribution APIs clear stored marketing data and leave checkout links clean
// whenever marketing permission is absent.
const previousWindow = globalThis.window;
const attributionStorage = createStorage({
  'clara.marketingAttribution.v1': JSON.stringify({gclid: 'stale'}),
});
globalThis.window = {localStorage: attributionStorage};
try {
  assert.equal(captureMarketingAttribution(false), null);
  assert.equal(
    attributionStorage.getItem('clara.marketingAttribution.v1'),
    null,
  );
  assert.equal(getSerializedMarketingAttribution(false), '');
  assert.equal(
    buildCheckoutUrlWithAttribution(
      'https://checkout.shopclaramendes.com/checkouts/test',
      false,
    ),
    'https://checkout.shopclaramendes.com/checkouts/test',
  );
} finally {
  if (previousWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = previousWindow;
  }
}
