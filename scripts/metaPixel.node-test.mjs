import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeCartLine} from '../app/lib/analyticsItems.ts';
import {
  CSP_FRAME_SRC,
  CSP_IMG_SRC,
  CSP_META_CONNECT_SRC,
  CSP_SCRIPT_SRC,
} from '../app/lib/csp.ts';
import {
  metaCommerceParameters,
  metaPixelAllowed,
  normalizeMetaPixelId,
} from '../app/lib/metaPixel.ts';
import {
  initializeMetaPixel,
  META_PIXEL_SCRIPT,
  setMetaConsent,
  trackMetaEvent,
} from '../app/lib/metaPixel.client.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

function fakeRuntime() {
  const scripts = [];
  return {
    scripts,
    runtime: {
      document: {
        createElement: () => ({async: false, src: ''}),
        head: {appendChild: (node) => scripts.push(node)},
      },
      window: {},
    },
  };
}

const PIXEL = '123456789012345';

test('pixel ids are long digit strings; anything else disables the pixel', () => {
  assert.equal(normalizeMetaPixelId(` ${PIXEL} `), PIXEL);
  assert.equal(normalizeMetaPixelId('GTM-ABC123'), null);
  assert.equal(normalizeMetaPixelId('12345'), null);
  assert.equal(normalizeMetaPixelId(undefined), null);
});

test('the pixel needs marketing consent, not just analytics', () => {
  assert.equal(
    metaPixelAllowed({canTrack: true, marketingAllowed: true}),
    true,
  );
  assert.equal(
    metaPixelAllowed({canTrack: true, marketingAllowed: false}),
    false,
  );
  assert.equal(
    metaPixelAllowed({canTrack: false, marketingAllowed: true}),
    false,
  );
});

test('commerce parameters use SKUs, the Meta catalog ids', () => {
  const item = normalizeCartLine({
    merchandise: {
      id: 'gid://shopify/ProductVariant/42',
      price: {amount: '26.99', currencyCode: 'EUR'},
      product: {
        id: 'gid://shopify/Product/7',
        title: 'The Great Wave off Kanagawa Art Print',
      },
      sku: 'CM-FW-01-8X10',
      title: '8 × 10 in',
    },
    quantity: 2,
  });
  assert.deepEqual(metaCommerceParameters([item], 'EUR'), {
    content_ids: ['CM-FW-01-8X10'],
    content_type: 'product',
    contents: [{id: 'CM-FW-01-8X10', item_price: 26.99, quantity: 2}],
    currency: 'EUR',
    value: 53.98,
  });
});

test('nothing is tracked before the pixel loads', () => {
  const {runtime, scripts} = fakeRuntime();
  assert.equal(trackMetaEvent('PageView', undefined, runtime), false);
  assert.equal(setMetaConsent(false, runtime), false);
  assert.equal(scripts.length, 0);
  assert.equal(initializeMetaPixel('not-a-pixel', runtime), false);
  assert.equal(scripts.length, 0);
});

test('loading adds fbevents.js once and queues init, events and consent', () => {
  const {runtime, scripts} = fakeRuntime();
  assert.equal(initializeMetaPixel(PIXEL, runtime), true);
  assert.equal(initializeMetaPixel(PIXEL, runtime), true);
  assert.deepEqual(
    scripts.map((s) => [s.src, s.async]),
    [[META_PIXEL_SCRIPT, true]],
  );

  assert.equal(trackMetaEvent('PageView', undefined, runtime), true);
  assert.equal(
    trackMetaEvent('ViewContent', {content_ids: ['CM-FW-01-8X10']}, runtime),
    true,
  );
  assert.equal(setMetaConsent(false, runtime), true);
  assert.deepEqual(runtime.window.fbq.queue, [
    ['init', PIXEL],
    ['track', 'PageView'],
    ['track', 'ViewContent', {content_ids: ['CM-FW-01-8X10']}],
    ['consent', 'revoke'],
  ]);
});

test('the CSP allows the pixel hosts', () => {
  assert.ok(CSP_SCRIPT_SRC.includes('https://connect.facebook.net'));
  assert.ok(CSP_IMG_SRC.includes('https://www.facebook.com'));
  assert.ok(CSP_META_CONNECT_SRC.includes('https://www.facebook.com'));
  assert.match(read('app/entry.server.tsx'), /\.\.\.CSP_META_CONNECT_SRC/);
});

test('root reads PUBLIC_META_PIXEL_ID and the component checks consent first', () => {
  const rootFile = read('app/root.tsx');
  assert.match(rootFile, /normalizeMetaPixelId\(env\.PUBLIC_META_PIXEL_ID\)/);
  assert.match(
    rootFile,
    /<MetaPixelAnalytics pixelId=\{data\.metaPixelId\} \/>/,
  );
  const component = read('app/components/MetaPixelAnalytics.tsx');
  assert.match(
    component,
    /metaPixelAllowed\(privacyReader\.current\(\)\) && initializeMetaPixel/,
  );
  assert.match(component, /visitorConsentCollected/);
});

test('after Accept the page counts once, whoever sends PageView first', () => {
  // Hydrogen re-sends the current page's views once consent arrives, so the
  // consent listener and the PAGE_VIEWED subscriber share one map.
  const component = read('app/components/MetaPixelAnalytics.tsx');
  assert.match(component, /^const lastViews = new Map<string, string>\(\);$/m);
  assert.equal(component.match(/new Map</g).length, 1);
  assert.match(
    component,
    /!isRepeatedView\(lastViews, 'PageView', window\.location\.href\)/,
  );
  assert.match(
    component,
    /isRepeatedView\(lastViews, 'PageView', payload\.url\)/,
  );
});

test('frame-src keeps the default-src frame hosts and adds facebook.com', () => {
  for (const host of [
    "'self'",
    'https://cdn.shopify.com',
    'https://shopify.com',
  ]) {
    assert.ok(CSP_FRAME_SRC.includes(host), host);
  }
  assert.ok(CSP_FRAME_SRC.includes('https://www.facebook.com'));
  assert.match(
    read('app/entry.server.tsx'),
    /frameSrc: \[\.\.\.CSP_FRAME_SRC\]/,
  );
});

test('a missing Customer Privacy API is loaded once, from Shopify', () => {
  const fallback = read('app/components/CustomerPrivacyApiFallback.tsx');
  assert.match(
    fallback,
    /https:\/\/cdn\.shopify\.com\/shopifycloud\/consent-tracking-api\/v0\.2\/consent-tracking-api\.js/,
  );
  assert.match(fallback, /'setTrackingConsent' in customerPrivacy\) return/);
  assert.match(
    fallback,
    /querySelector\(`script\[src="\$\{CUSTOMER_PRIVACY_API\}"\]`\)/,
  );
  assert.match(read('app/root.tsx'), /<CustomerPrivacyApiFallback \/>/);
});
