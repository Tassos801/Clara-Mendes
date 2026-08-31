import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProdigiOrderFromShopify,
  natalPrintUrl,
} from '../app/lib/sky/fulfilment.ts';
import {
  canonicalNatalParams,
  parseCanonicalNatalParams,
  toNatalCartAttributes,
  validateNatalParams,
} from '../app/lib/natal/params.ts';
import {toCartAttributes, validateSkyParams} from '../app/lib/sky/params.ts';
import {
  decodeCanonicalToken,
  signCanonical,
  signSkyParams,
} from '../app/lib/sky/sign.server.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const ORIGIN = 'https://shopclaramendes.com';

const natal = validateNatalParams({
  name: 'Amélie Nováková',
  date: '2026-05-14',
  time: '07:32',
  lat: 52.52,
  lon: 13.405,
  tz: 'Europe/Berlin',
  place: 'Berlin, Germany',
  details: '3.4 kg · 51 cm',
  theme: 'linen',
}).params;

const sky = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'Hi',
  theme: 'linen',
}).params;

const toProps = (attrs) =>
  attrs.map(({key, value}) => ({name: key, value}));

async function mixedOrder(natalOverrides = {}) {
  const skySig = await signSkyParams(sky, SECRET);
  const natalSig = await signCanonical(canonicalNatalParams(natal), SECRET);
  return {
    id: 6001,
    name: '#2042',
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
      {
        id: 2,
        sku: 'CM-SKY-20X24-BLK',
        quantity: 1,
        properties: toProps(toCartAttributes(sky, skySig)),
      },
      {
        id: 3,
        sku: 'CM-NATAL-8X10-NAT',
        quantity: 2,
        properties: toProps(toNatalCartAttributes(natal, natalSig)),
        ...natalOverrides,
      },
    ],
  };
}

test('a mixed order builds one Prodigi payload with both personalised kinds', async () => {
  const result = await buildProdigiOrderFromShopify(await mixedOrder(), {
    secret: SECRET,
    origin: ORIGIN,
  });
  assert.equal(result.kind, 'order', JSON.stringify(result));
  const items = result.payload.items;
  assert.equal(items.length, 2, 'plain print line is not fulfilled by us');

  const skyItem = items.find((i) => i.merchantReference === 'line:2');
  assert.equal(skyItem.sku, 'GLOBAL-CFP-20X24');
  assert.deepEqual(skyItem.attributes, {color: 'black'});
  assert.match(skyItem.assets[0].url, /\/api\/sky-print\/.+\.pdf\?size=20x24$/);

  const natalItem = items.find((i) => i.merchantReference === 'line:3');
  assert.equal(natalItem.sku, 'GLOBAL-CFP-8X10');
  assert.deepEqual(natalItem.attributes, {color: 'natural'});
  assert.equal(natalItem.copies, 2);
  assert.match(
    natalItem.assets[0].url,
    /\/api\/natal-print\/.+\.pdf\?size=8x10$/,
  );

  // The natal asset token decodes back to exactly the signed params.
  const token = natalItem.assets[0].url
    .split('/api/natal-print/')[1]
    .replace(/\.pdf\?size=8x10$/, '');
  const decoded = await decodeCanonicalToken(token, SECRET);
  assert.ok(decoded.ok);
  const parsed = parseCanonicalNatalParams(decoded.canonical);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.params, natal);
  assert.equal(
    natalItem.assets[0].url,
    natalPrintUrl(ORIGIN, token, '8x10'),
  );
});

test('a natal line with a tampered signature is a problem, not an order', async () => {
  const order = await mixedOrder();
  order.line_items[2].properties = order.line_items[2].properties.map((p) =>
    p.name === '_sig' ? {...p, value: 'tampered'} : p,
  );
  const result = await buildProdigiOrderFromShopify(order, {
    secret: SECRET,
    origin: ORIGIN,
  });
  assert.equal(result.kind, 'problem');
  assert.match(result.reason, /Line 3: bad signature/);
});

test('a natal line with an unknown SKU is a problem', async () => {
  const result = await buildProdigiOrderFromShopify(
    await mixedOrder({sku: 'CM-NATAL-9X9-UNF'}),
    {secret: SECRET, origin: ORIGIN},
  );
  assert.equal(result.kind, 'problem');
  assert.match(result.reason, /Line 3: unknown SKU/);
});

test('a natal line whose params fail validation is a problem', async () => {
  const order = await mixedOrder();
  order.line_items[2].properties = order.line_items[2].properties.map((p) =>
    p.name === 'Name' ? {...p, value: ''} : p,
  );
  const result = await buildProdigiOrderFromShopify(order, {
    secret: SECRET,
    origin: ORIGIN,
  });
  assert.equal(result.kind, 'problem');
  assert.match(result.reason, /Line 3/);
});

test('the cart signer signs both kinds and passes plain lines through', async () => {
  const {signSkyCartLines} = await import('../app/lib/sky/cartLines.server.ts');
  const lines = [
    {merchandiseId: 'gid://plain', attributes: []},
    {merchandiseId: 'gid://sky', attributes: toCartAttributes(sky)},
    {merchandiseId: 'gid://natal', attributes: toNatalCartAttributes(natal)},
  ];
  const result = await signSkyCartLines(lines, SECRET);
  assert.ok(result.ok);
  assert.deepEqual(result.lines[0].attributes, []);
  const skySigned = new Map(result.lines[1].attributes.map((a) => [a.key, a.value]));
  assert.equal(skySigned.get('_sig'), await signSkyParams(sky, SECRET));
  assert.equal(skySigned.has('_kind'), false);
  const natalSigned = new Map(result.lines[2].attributes.map((a) => [a.key, a.value]));
  assert.equal(natalSigned.get('_kind'), 'natal');
  assert.equal(
    natalSigned.get('_sig'),
    await signCanonical(canonicalNatalParams(natal), SECRET),
  );
  const noSecret = await signSkyCartLines(lines, undefined);
  assert.equal(noSecret.ok, false);
});
