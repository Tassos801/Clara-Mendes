import assert from 'node:assert/strict';
import {
  fromNatalCartAttributes,
  isNatalCartLine,
  NATAL_DEFAULT_ASTRO_TIME,
  NATAL_DETAILS_MAX,
  NATAL_NAME_MAX,
  canonicalNatalParams,
  parseCanonicalNatalParams,
  toNatalCartAttributes,
  validateNatalParams,
} from '../app/lib/natal/params.ts';
import {
  NATAL_PRODUCT_HANDLE,
  NATAL_PRODUCT_TYPE,
  NATAL_VARIANTS,
  natalVariantForSku,
} from '../app/lib/natal/products.ts';
import {fromCartAttributes, isSkyCartLine} from '../app/lib/sky/params.ts';
import {SKY_VARIANTS} from '../app/lib/sky/products.ts';

const base = {
  name: 'Amélie Nováková',
  date: '2026-05-14',
  time: '07:32',
  lat: 52.52,
  lon: 13.405,
  tz: 'Europe/Berlin',
  place: 'Berlin, Germany',
  details: '3.4 kg · 51 cm',
  theme: 'linen',
};

// Happy path.
const ok = validateNatalParams(base);
assert.ok(ok.ok, JSON.stringify(ok));
assert.equal(ok.params.v, 1);
assert.equal(ok.params.name, 'Amélie Nováková');
assert.equal(ok.params.time, '07:32');
assert.equal(ok.params.lat, 52.52);
assert.equal(ok.params.details, '3.4 kg · 51 cm');

// Name is required and capped.
assert.equal(validateNatalParams({...base, name: ''}).ok, false);
assert.equal(validateNatalParams({...base, name: '  '}).ok, false);
assert.equal(
  validateNatalParams({...base, name: 'x'.repeat(NATAL_NAME_MAX + 1)}).ok,
  false,
);
assert.ok(
  validateNatalParams({...base, name: 'x'.repeat(NATAL_NAME_MAX)}).ok,
);

// Unprintable glyphs are rejected in name and details.
assert.equal(validateNatalParams({...base, name: 'Mia 🌙'}).ok, false);
assert.equal(validateNatalParams({...base, details: '愛 3.4 kg'}).ok, false);

// Time is optional: blank means "not given" and stays blank in params.
const noTime = validateNatalParams({...base, time: ''});
assert.ok(noTime.ok);
assert.equal(noTime.params.time, '');
const undefTime = validateNatalParams({...base, time: undefined});
assert.ok(undefTime.ok);
assert.equal(undefTime.params.time, '');
assert.equal(validateNatalParams({...base, time: '25:00'}).ok, false);
assert.equal(NATAL_DEFAULT_ASTRO_TIME, '12:00');

// Details are optional and capped.
const noDetails = validateNatalParams({...base, details: ''});
assert.ok(noDetails.ok);
assert.equal(noDetails.params.details, '');
assert.equal(
  validateNatalParams({...base, details: 'x'.repeat(NATAL_DETAILS_MAX + 1)})
    .ok,
  false,
);

// Date window and shape.
assert.equal(validateNatalParams({...base, date: '1899-12-31'}).ok, false);
assert.equal(validateNatalParams({...base, date: '2026-02-30'}).ok, false);

// Coordinates round to 4 dp; timezone must be real.
const rounded = validateNatalParams({...base, lat: 52.5200001, lon: 13.40499});
assert.ok(rounded.ok);
assert.equal(rounded.params.lat, 52.52);
assert.equal(rounded.params.lon, 13.405);
assert.equal(validateNatalParams({...base, tz: 'Mars/Olympus'}).ok, false);

// Canonical string: fixed key order, stable, round-trips.
const canonical = canonicalNatalParams(ok.params);
assert.ok(canonical.startsWith('v=1&name='));
assert.equal(
  canonical,
  canonicalNatalParams(structuredClone(ok.params)),
  'canonicalization must be deterministic',
);
const reparsed = parseCanonicalNatalParams(canonical);
assert.ok(reparsed.ok);
assert.deepEqual(reparsed.params, ok.params);
assert.equal(canonicalNatalParams(reparsed.params), canonical);

// Cart attributes round-trip and carry the kind discriminator.
const attrs = toNatalCartAttributes(ok.params, 'sig-value');
const keys = new Map(attrs.map((a) => [a.key, a.value]));
assert.equal(keys.get('_kind'), 'natal');
assert.equal(keys.get('_v'), '1');
assert.equal(keys.get('Name'), 'Amélie Nováková');
assert.equal(keys.get('_sig'), 'sig-value');
const decoded = fromNatalCartAttributes(attrs);
assert.ok(decoded.ok);
assert.deepEqual(decoded.params, ok.params);
assert.equal(decoded.sig, 'sig-value');

// A natal line without a time omits it from the visible Born value.
const noTimeAttrs = toNatalCartAttributes(noTime.params);
const bornValue = noTimeAttrs.find((a) => a.key === 'Born')?.value;
assert.ok(bornValue && !bornValue.includes(':'), bornValue);

// Kind dispatch: natal lines are natal, and are NOT sky lines even though
// they carry _v — the sky detector must require the absence of _kind.
assert.ok(isNatalCartLine(attrs));
assert.equal(isSkyCartLine(attrs), false);
const skyish = [
  {key: '_v', value: '1'},
  {key: '_date', value: '2026-05-14'},
];
assert.ok(isSkyCartLine(skyish));
assert.equal(isNatalCartLine(skyish), false);
assert.equal(fromNatalCartAttributes(skyish).ok, false);
// The sky decoder must refuse a natal line outright.
assert.equal(fromCartAttributes(attrs).ok, false);

// Variant table mirrors the sky's Prodigi mapping exactly.
assert.deepEqual(Object.keys(NATAL_VARIANTS), [
  'CM-NATAL-8X10-UNF',
  'CM-NATAL-8X10-NAT',
  'CM-NATAL-8X10-BLK',
  'CM-NATAL-20X24-UNF',
  'CM-NATAL-20X24-NAT',
  'CM-NATAL-20X24-BLK',
]);
for (const [sku, variant] of Object.entries(NATAL_VARIANTS)) {
  const skySku = sku.replace('CM-NATAL-', 'CM-SKY-');
  const skyVariant = SKY_VARIANTS[skySku];
  assert.ok(skyVariant, `${sku}: no sky counterpart ${skySku}`);
  assert.equal(variant.prodigiSku, skyVariant.prodigiSku);
  assert.deepEqual(variant.attributes, skyVariant.attributes);
  assert.equal(variant.size, skyVariant.size);
}
assert.equal(natalVariantForSku('cm-natal-8x10-unf')?.prodigiSku, 'GLOBAL-FAP-8X10');
assert.equal(natalVariantForSku('CM-SKY-8X10-UNF'), null);
assert.equal(NATAL_PRODUCT_HANDLE, 'first-light-birth-poster');
assert.equal(NATAL_PRODUCT_TYPE, 'Personalised Art');
