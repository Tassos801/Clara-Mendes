import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {
  base64UrlDecode,
  base64UrlEncode,
  decodeSkyToken,
  encodeSkyToken,
  signCanonical,
  verifyCanonical,
} from '../app/lib/sky/sign.server.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const params = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'Hello — Ωμέγα',
  theme: 'linen',
}).params;

test('base64url round-trips arbitrary bytes and rejects junk', () => {
  const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
  const text = base64UrlEncode(bytes);
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual([...base64UrlDecode(text)], [...bytes]);
  assert.equal(base64UrlDecode('not base64!'), null);
});

test('sign/verify round trip and tamper detection', async () => {
  const sig = await signCanonical('a=1', SECRET);
  assert.match(sig, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(await verifyCanonical('a=1', sig, SECRET), true);
  assert.equal(await verifyCanonical('a=2', sig, SECRET), false);
  assert.equal(await verifyCanonical('a=1', sig, 'other'), false);
  assert.equal(await verifyCanonical('a=1', 'nope', SECRET), false);
});

test('token encodes params and rejects tampering', async () => {
  const token = await encodeSkyToken(params, SECRET);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  const decoded = await decodeSkyToken(token, SECRET);
  assert.equal(decoded.ok, true);
  assert.deepEqual(decoded.params, params);
  const [body, sig] = token.split('.');
  assert.equal((await decodeSkyToken(`${body}x.${sig}`, SECRET)).ok, false);
  assert.equal((await decodeSkyToken(`${body}.${sig}.x`, SECRET)).ok, false);
  assert.equal((await decodeSkyToken('garbage', SECRET)).ok, false);
  assert.equal((await decodeSkyToken(token, 'wrong')).ok, false);
});
