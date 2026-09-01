import assert from 'node:assert/strict';
import test from 'node:test';
import {createHmac} from 'node:crypto';
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {prodigiCfpAttributes} from '../app/lib/sky/products.ts';
import {toCartAttributes, validateSkyParams} from '../app/lib/sky/params.ts';
import {decodeSkyToken, signSkyParams} from '../app/lib/sky/sign.server.ts';
import {verifyShopifyWebhook} from '../app/lib/shopifyWebhook.server.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const params = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'Hi',
  theme: 'linen',
}).params;

async function order(overrides = {}) {
  const sig = await signSkyParams(params, SECRET);
  const props = toCartAttributes(params, sig).map(({key, value}) => ({name: key, value}));
  return {
    id: 5001,
    name: '#1042',
    email: 'anna@example.com',
    phone: null,
    shipping_address: {
      name: 'Anna Beispiel',
      address1: 'Musterstraße 1',
      address2: '',
      city: 'Berlin',
      province: null,
      zip: '10115',
      country_code: 'DE',
      phone: '+49 30 1234567',
    },
    line_items: [
      {id: 1, sku: 'CM-PRINT-8X10', quantity: 1, properties: []},
      {id: 2, sku: 'CM-SKY-20X24-BLK', quantity: 2, properties: props},
    ],
    ...overrides,
  };
}

test('builds a Prodigi order for signed sky lines only', async () => {
  const result = await buildProdigiOrderFromShopify(await order(), {
    secret: SECRET,
    origin: 'https://shopclaramendes.com',
  });
  assert.equal(result.kind, 'order');
  const p = result.payload;
  assert.equal(p.idempotencyKey, 'shopify:5001');
  assert.equal(p.merchantReference, '#1042');
  assert.equal(p.shippingMethod, 'Standard');
  assert.equal(p.recipient.name, 'Anna Beispiel');
  assert.equal(p.recipient.email, 'anna@example.com');
  assert.equal(p.recipient.phoneNumber, '+49 30 1234567');
  // No line2 key at all when address2 is blank — Prodigi rejects
  // empty-string address parts (MustNotBeEmptyOrWhitespace).
  assert.deepEqual(p.recipient.address, {
    line1: 'Musterstraße 1',
    townOrCity: 'Berlin',
    stateOrCounty: null,
    postalOrZipCode: '10115',
    countryCode: 'DE',
  });
  const withSuite = await buildProdigiOrderFromShopify(
    await order({
      shipping_address: {
        name: 'Anna Beispiel',
        address1: 'Musterstraße 1',
        address2: 'Apt 4',
        city: 'Berlin',
        province: null,
        zip: '10115',
        country_code: 'DE',
        phone: null,
      },
    }),
    {secret: SECRET, origin: 'https://shopclaramendes.com'},
  );
  assert.equal(withSuite.payload.recipient.address.line2, 'Apt 4');
  assert.equal(p.items.length, 1, 'the print line is left to the Prodigi app');
  assert.equal(p.items[0].sku, 'GLOBAL-CFP-20X24');
  assert.deepEqual(p.items[0].attributes, prodigiCfpAttributes('black'));
  assert.equal(p.items[0].copies, 2);
  assert.equal(p.items[0].merchantReference, 'line:2');
  const url = p.items[0].assets[0].url;
  assert.match(
    url,
    /^https:\/\/shopclaramendes\.com\/api\/sky-print\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.pdf\?size=20x24$/,
  );
  const token = url.split('/api/sky-print/')[1].split('.pdf')[0];
  const decoded = await decodeSkyToken(token, SECRET);
  assert.equal(decoded.ok, true);
  assert.deepEqual(decoded.params, params, 'the asset token carries the exact parameters');
});

test('skips orders without sky lines and flags problems', async () => {
  const none = await buildProdigiOrderFromShopify(
    await order({line_items: [{id: 1, sku: 'CM-PRINT-8X10', quantity: 1, properties: []}]}),
    {secret: SECRET, origin: 'https://x'},
  );
  assert.equal(none.kind, 'skip');

  const tampered = await order();
  tampered.line_items[1].properties = tampered.line_items[1].properties.map((p) =>
    p.name === '_sig' ? {...p, value: 'tampered'} : p,
  );
  const bad = await buildProdigiOrderFromShopify(tampered, {secret: SECRET, origin: 'https://x'});
  assert.equal(bad.kind, 'problem');
  assert.match(bad.reason, /signature/i);

  const unknownSku = await order();
  unknownSku.line_items[1].sku = 'CM-SKY-30X40-BLK';
  const sku = await buildProdigiOrderFromShopify(unknownSku, {secret: SECRET, origin: 'https://x'});
  assert.equal(sku.kind, 'problem');
  assert.match(sku.reason, /unknown SKU/i);

  const noAddress = await buildProdigiOrderFromShopify(await order({shipping_address: null}), {
    secret: SECRET,
    origin: 'https://x',
  });
  assert.equal(noAddress.kind, 'problem');
  assert.match(noAddress.reason, /shipping address/i);
});

test('Shopify webhook HMAC verification', async () => {
  const secret = 'shpss_test';
  const body = '{"id":1}';
  const good = createHmac('sha256', secret).update(body).digest('base64');
  assert.equal(await verifyShopifyWebhook(body, good, secret), true);
  assert.equal(await verifyShopifyWebhook(body + ' ', good, secret), false);
  assert.equal(await verifyShopifyWebhook(body, 'AAAA', secret), false);
  assert.equal(await verifyShopifyWebhook(body, null, secret), false);
  assert.equal(await verifyShopifyWebhook(body, good, 'other'), false);
});
