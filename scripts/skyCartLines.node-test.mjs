import assert from 'node:assert/strict';
import test from 'node:test';
import {signSkyCartLines} from '../app/lib/sky/cartLines.server.ts';
import {
  canonicalSkyParams,
  toCartAttributes,
  validateSkyParams,
} from '../app/lib/sky/params.ts';
import {verifyCanonical} from '../app/lib/sky/sign.server.ts';

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

test('signs sky lines, leaves other lines alone', async () => {
  const lines = [
    {merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1},
    {
      merchandiseId: 'gid://shopify/ProductVariant/2',
      quantity: 2,
      attributes: toCartAttributes(params),
    },
  ];
  const result = await signSkyCartLines(lines, SECRET);
  assert.equal(result.ok, true);
  assert.equal(result.lines[0].attributes, undefined);
  assert.equal(result.lines[1].quantity, 2);
  const sig = result.lines[1].attributes.find((a) => a.key === '_sig').value;
  assert.equal(await verifyCanonical(canonicalSkyParams(params), sig, SECRET), true);
  assert.equal(result.lines[1].attributes.find((a) => a.key === 'Place').value, 'Paris, France');
});

test('a forged signature from the browser is replaced', async () => {
  const lines = [{merchandiseId: 'x', quantity: 1, attributes: toCartAttributes(params, 'forged')}];
  const result = await signSkyCartLines(lines, SECRET);
  assert.equal(result.ok, true);
  assert.notEqual(result.lines[0].attributes.find((a) => a.key === '_sig').value, 'forged');
});

test('rejects invalid sky lines and a missing secret', async () => {
  const bad = [
    {
      merchandiseId: 'x',
      quantity: 1,
      attributes: [
        {key: '_v', value: '1'},
        {key: '_date', value: '1850-01-01'},
      ],
    },
  ];
  assert.equal((await signSkyCartLines(bad, SECRET)).ok, false);
  const good = [{merchandiseId: 'x', quantity: 1, attributes: toCartAttributes(params)}];
  const noSecret = await signSkyCartLines(good, undefined);
  assert.equal(noSecret.ok, false);
  assert.match(noSecret.error, /not available/i);
  const plain = await signSkyCartLines([{merchandiseId: 'x', quantity: 1}], undefined);
  assert.equal(plain.ok, true, 'ordinary lines never need the secret');
});
