import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalSkyParams, validateSkyParams} from '../app/lib/sky/params.ts';
import {
  base64UrlDecode,
  base64UrlEncode,
  decodeSkyToken,
  encodeCanonicalToken,
  encodeSkyToken,
  signCanonical,
  verifyCanonical,
} from '../app/lib/sky/sign.server.ts';
import {
  canonicalNatalParams,
  validateNatalParams,
} from '../app/lib/natal/params.ts';

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

test('the cart signature never verifies as a print token', async () => {
  // `_sig` travels to the browser in every cart response; the print token
  // must be signed over something the browser never sees.
  const {base64UrlEncode, signSkyParams, decodeSkyToken: decodePrint} =
    await import('../app/lib/sky/sign.server.ts');
  const {canonicalSkyParams} = await import('../app/lib/sky/params.ts');
  const canonical = canonicalSkyParams(params);
  const cartSig = await signSkyParams(params, SECRET);
  const forged = `${base64UrlEncode(new TextEncoder().encode(canonical))}.${cartSig}`;
  const decoded = await decodePrint(forged, SECRET);
  assert.equal(decoded.ok, false);
  assert.equal(decoded.error, 'Bad signature.');
});

test('print tokens carry v2 layout and details, and v1 tokens still decode', async () => {
  const base = {
    date: '2019-06-14',
    time: '22:00',
    lat: 48.8566,
    lon: 2.3522,
    tz: 'Europe/Paris',
    place: 'Paris, France',
    title: 'The night we met',
    theme: 'linen',
  };
  const secret = 'test-secret-for-v2';
  for (const input of [
    {...base, layout: 'compass', details: 'names,grid,time'},
    {...base, v: 1},
  ]) {
    const params = validateSkyParams(input).params;
    const token = await encodeSkyToken(params, secret);
    const decoded = await decodeSkyToken(token, secret);
    assert.equal(decoded.ok, true, JSON.stringify(input));
    assert.deepEqual(decoded.params, params);
  }
});

test('non-canonical print tokens are rejected', async () => {
  const v2Canonical = canonicalSkyParams(params);
  assert.match(v2Canonical, /&layout=classic&details=none$/);

  // (a) details out of canonical order (should be 'names,time').
  const unsortedDetails = v2Canonical.replace('details=none', 'details=time,names');
  // (b) details present but empty, instead of the canonical 'none'.
  const emptyDetails = v2Canonical.replace('details=none', 'details=');
  // (c) the v2 layout/details tail dropped entirely.
  const missingTail = v2Canonical.replace(/&layout=classic&details=none$/, '');
  // (d) the pinned v1 canonical string with a v2 key smuggled on.
  const v1WithLayout =
    'v=1&date=2019-06-14&time=22:00&lat=48.8566&lon=2.3522&tz=Europe%2FParis&place=Paris%2C%20France&title=The%20night%20we%20met&theme=linen&layout=compass';

  for (const body of [unsortedDetails, emptyDetails, missingTail, v1WithLayout]) {
    const token = await encodeCanonicalToken(body, SECRET, 'print');
    const decoded = await decodeSkyToken(token, SECRET);
    assert.deepEqual(decoded, {ok: false, error: 'Non-canonical token.'}, body);
  }

  // (e) a birth-poster canonical string, signed as a print token and handed
  // to the sky decoder. It parses as a spurious-but-valid v1 SkyParams
  // (title='', since natal has no `title` key, and v2 extras like `name=`
  // and `details=` are ignored under v1) and then fails the re-encode
  // check for the same reason as (a)-(d): the canonical carries a `name=`
  // key and no `title=` key, so re-encoding it as SkyParams never matches
  // the original string byte for byte. Empirically this also lands on
  // 'Non-canonical token.', not a distinct validation error.
  const natal = validateNatalParams({
    name: 'Mila',
    date: '2024-03-02',
    time: '07:32',
    lat: 52.52,
    lon: 13.405,
    tz: 'Europe/Berlin',
    place: 'Berlin, Germany',
    details: '3.2kg',
    theme: 'linen',
  });
  assert.equal(natal.ok, true);
  const natalCanonical = canonicalNatalParams(natal.params);
  const natalToken = await encodeCanonicalToken(natalCanonical, SECRET, 'print');
  const natalDecoded = await decodeSkyToken(natalToken, SECRET);
  assert.equal(natalDecoded.ok, false);
});
