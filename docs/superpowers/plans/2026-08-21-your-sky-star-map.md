# Your Sky (personalised star map) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a personalised star-map product (`your-sky-star-map`) with a live SVG preview on the PDP and fully automated Prodigi fulfilment from a paid-order webhook, proven with a sandbox order.

**Architecture:** One pure scene model (`computeSky`) feeds a React SVG preview and a pdf-lib print renderer. Cart line attributes carry the signed parameters; an `orders/paid` webhook creates the Prodigi order whose asset URL points back at a signed Oxygen route that renders the PDF on demand. No storage, no extra services.

**Tech Stack:** Hydrogen 2026.4 / React Router 7 on Oxygen (Cloudflare workers), `astronomy-engine` (MIT), `pdf-lib` + `@pdf-lib/fontkit`, Yale Bright Star Catalogue (PD), d3-celestial constellation lines (BSD-3), GeoNames cities15000 (CC-BY), EB Garamond (OFL), `sharp` (plates, build-time only), Node 24 `node --test` with TS type-stripping.

Spec: `docs/superpowers/specs/2026-08-21-your-sky-star-map-design.md`.

Conventions that matter here:
- Tests live in `scripts/*.node-test.mjs` and import TS modules by relative path (`../app/lib/...ts`). Modules under test must therefore use **relative imports only** (no `~/` alias) and no JSX. Keep `.server.ts` modules free of Vite-only imports.
- Commits: `git add <files> && git commit -m "<message>"` on branch `fable/your-sky-star-map`; never push workflow files; lockfile is npm 11.
- Worktree: `C:/Users/admin/Desktop/Mine/shopify/clara-remediation`.

---

## File structure

| Path | Responsibility |
|---|---|
| `app/lib/sky/astronomyEngine.ts` | CJS/ESM interop shim for `astronomy-engine` |
| `app/lib/sky/params.ts` | `SkyParams` type, validation, canonical string, cart-attribute encode/decode |
| `app/lib/sky/sign.server.ts` | HMAC-SHA256 sign/verify + token encode/decode (WebCrypto) |
| `app/lib/sky/products.ts` | Handle, sizes (points/pixels), variant SKU → Prodigi SKU/attributes |
| `app/lib/sky/time.ts` | Local wall time in an IANA zone → UTC `Date` |
| `app/lib/sky/astro.ts` | Sky positions: stars (J2000 → horizontal via one rotation), Moon, planets |
| `app/lib/sky/projection.ts` | Stereographic projection + layout geometry |
| `app/lib/sky/themes.ts` | `SkyTheme` constants |
| `app/lib/sky/scene.ts` | `computeSky()` → `SkyScene` (pure) |
| `app/lib/sky/moon.ts` | Moon phase SVG path (shared by SVG and PDF) |
| `app/lib/sky/catalog.ts` | Types + loaders for star/line JSON |
| `app/lib/sky/svg.tsx` | `<SkySvg>` preview renderer |
| `app/lib/sky/pdf.server.ts` | `renderSkyPdf()` with pdf-lib |
| `app/lib/sky/places.server.ts` | Place search over bundled GeoNames |
| `app/lib/sky/fulfilment.ts` | Shopify order JSON → Prodigi order payload |
| `app/lib/sky/cartLines.server.ts` | Sign sky lines inside the cart action |
| `app/lib/prodigi.server.ts` | Prodigi API client |
| `app/lib/shopifyWebhook.server.ts` | Webhook HMAC verification |
| `app/components/SkyConfigurator.tsx` | Form + live preview |
| `app/routes/api.places.tsx` | GET place search |
| `app/routes/api.sky-print.$token[.pdf].tsx` | GET PDF |
| `app/routes/webhooks.orders-paid.tsx` | POST webhook |
| `app/data/sky/{stars,constellations,places}.json` | Built data |
| `public/fonts/EBGaramond-{Regular,Italic}.ttf`, `public/fonts/OFL-EBGaramond.txt` | Fonts |
| `public/sky/plates/<theme>.jpg`, `<theme>-preview.jpg` | Background plates |
| `scripts/build-sky-data.mjs`, `scripts/generate-sky-plates.mjs`, `scripts/sky-render-local.mjs`, `scripts/sky-register-webhook.mjs`, `scripts/sky-replay-order.mjs` | Tooling |
| `NOTICE.md`, `docs/your-sky-release.md` | Attribution, runbook |
| Modified: `app/lib/catalogFilters.ts`, `app/components/ClaraShell.tsx`, `app/lib/sitemap.ts`, `app/routes/products.$handle.tsx`, `app/routes/cart.tsx`, `app/components/CartLineItem.tsx`, `app/styles/app.css`, `env.d.ts`, `package.json` | Integration |

---

### Task 1: Dependencies, fonts, data build

**Files:**
- Modify: `package.json`
- Create: `scripts/build-sky-data.mjs`, `app/data/sky/stars.json`, `app/data/sky/constellations.json`, `app/data/sky/places.json`, `public/fonts/EBGaramond-Regular.ttf`, `public/fonts/EBGaramond-Italic.ttf`, `public/fonts/OFL-EBGaramond.txt`, `NOTICE.md`
- Modify: `.gitignore` (add `data/sky-sources/`)

- [ ] **Step 1: Install runtime deps**

Run: `npm install astronomy-engine@2.1.19 pdf-lib@1.17.1 @pdf-lib/fontkit@1.1.1`
Expected: package.json gains the three deps; `package-lock.json` updated with npm 11.

- [ ] **Step 2: Copy fonts**

The static TTFs were fetched from the Google Fonts CSS API into the scratchpad (`skydata/fonts/ebg-1.ttf` = weight 500, `ebg-2.ttf` = Regular 400, `ebg-3.ttf` = Italic 400 — confirm with fontkit in Step 5). Copy:

```bash
mkdir -p public/fonts
cp "$SCRATCH/skydata/fonts/ebg-2.ttf" public/fonts/EBGaramond-Regular.ttf
cp "$SCRATCH/skydata/fonts/ebg-3.ttf" public/fonts/EBGaramond-Italic.ttf
cp "$SCRATCH/skydata/fonts/OFL.txt" public/fonts/OFL-EBGaramond.txt
```

- [ ] **Step 3: Write the data build script**

`scripts/build-sky-data.mjs`:

```js
#!/usr/bin/env node
// Builds app/data/sky/*.json from public catalogues. Sources are cached in
// data/sky-sources/ (gitignored); outputs are committed.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const SOURCES = {
  stars:
    'https://raw.githubusercontent.com/aduboisforge/Bright-Star-Catalog-JSON/master/BSC.json',
  lines:
    'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json',
  cities: 'https://download.geonames.org/export/dump/cities15000.zip',
};
const SRC_DIR = resolve('data/sky-sources');
const OUT_DIR = resolve('app/data/sky');
mkdirSync(SRC_DIR, {recursive: true});
mkdirSync(OUT_DIR, {recursive: true});

async function fetchTo(url, file) {
  const target = resolve(SRC_DIR, file);
  if (existsSync(target)) return target;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  return target;
}

function hmsToDeg(hms) {
  const [h, m, s] = hms.split(':').map(Number);
  return (h + m / 60 + s / 3600) * 15;
}
function dmsToDeg(dms) {
  const sign = dms.trim().startsWith('-') ? -1 : 1;
  const [d, m, s] = dms.replace(/^[+-]/, '').split(':').map(Number);
  return sign * (d + m / 60 + s / 3600);
}
const r3 = (n) => Math.round(n * 1000) / 1000;

// Stars: flat [ra°, dec°, mag, ...] sorted by brightness.
const bsc = JSON.parse(readFileSync(await fetchTo(SOURCES.stars, 'BSC.json'), 'utf8'));
const stars = bsc
  .map((s) => ({ra: hmsToDeg(s.RA), dec: dmsToDeg(s.DEC), mag: Number(s.MAG)}))
  .filter((s) => Number.isFinite(s.ra) && Number.isFinite(s.dec) && s.mag <= 6.5)
  .sort((a, b) => a.mag - b.mag);
writeFileSync(
  resolve(OUT_DIR, 'stars.json'),
  JSON.stringify({
    source: 'Yale Bright Star Catalogue v5 (public domain)',
    count: stars.length,
    data: stars.flatMap((s) => [r3(s.ra), r3(s.dec), Math.round(s.mag * 100) / 100]),
  }),
);

// Constellation lines: d3-celestial GeoJSON, RA in -180..180 → 0..360.
const geo = JSON.parse(readFileSync(await fetchTo(SOURCES.lines, 'constellations.lines.json'), 'utf8'));
const lines = [];
for (const feature of geo.features) {
  for (const line of feature.geometry.coordinates) {
    for (let i = 1; i < line.length; i++) {
      const [ra1, dec1] = line[i - 1];
      const [ra2, dec2] = line[i];
      lines.push([r3((ra1 + 360) % 360), r3(dec1), r3((ra2 + 360) % 360), r3(dec2)]);
    }
  }
}
writeFileSync(
  resolve(OUT_DIR, 'constellations.json'),
  JSON.stringify({source: 'd3-celestial constellations.lines.json (BSD-3-Clause)', count: lines.length, data: lines.flat()}),
);

// Places: GeoNames cities15000 (CC BY 4.0) → [name, ascii, cc, lat, lon, tzIndex, population]
const zip = await fetchTo(SOURCES.cities, 'cities15000.zip');
const txt = resolve(SRC_DIR, 'cities15000.txt');
if (!existsSync(txt)) execFileSync('unzip', ['-o', '-q', zip, '-d', SRC_DIR]);
const tzIndex = new Map();
const places = [];
for (const row of readFileSync(txt, 'utf8').split('\n')) {
  if (!row) continue;
  const c = row.split('\t');
  const tz = c[17];
  if (!tzIndex.has(tz)) tzIndex.set(tz, tzIndex.size);
  places.push([c[1], c[2], c[8], Math.round(+c[4] * 1e4) / 1e4, Math.round(+c[5] * 1e4) / 1e4, tzIndex.get(tz), +c[14]]);
}
places.sort((a, b) => b[6] - a[6]);
writeFileSync(
  resolve(OUT_DIR, 'places.json'),
  JSON.stringify({source: 'GeoNames cities15000 (CC BY 4.0) https://www.geonames.org', tz: [...tzIndex.keys()], data: places}),
);
console.log(`stars ${stars.length}, lines ${lines.length}, places ${places.length}`);
```

- [ ] **Step 4: Run it and add the npm script**

Run: `node scripts/build-sky-data.mjs`
Expected: `stars 9096, lines ~700, places ~34000`; three JSON files in `app/data/sky/` (stars ≈ 150 KB, constellations ≈ 30 KB, places ≈ 2 MB). Add `"sky:data": "node scripts/build-sky-data.mjs"` to `package.json` scripts and `data/sky-sources/` to `.gitignore`.

- [ ] **Step 5: Verify font styles**

Run: `node -e "import('@pdf-lib/fontkit').then(async m=>{const fk=m.default;for(const f of ['Regular','Italic']){const fo=fk.create(require('fs').readFileSync('public/fonts/EBGaramond-'+f+'.ttf'));console.log(f,fo.familyName,fo.subfamilyName,fo.hasGlyphForCodePoint(0x3A9),fo.hasGlyphForCodePoint(0x416))}})"`
Expected: `Regular EB Garamond Regular true true`, `Italic EB Garamond Italic true true` (Greek Ω and Cyrillic Ж covered). If Regular prints `Medium`, swap in `ebg-1.ttf`.

- [ ] **Step 6: NOTICE.md**

```markdown
# Third-party data and fonts

- Star positions: Yale Bright Star Catalogue, 5th ed. (Hoffleit & Warren), public domain; JSON mirror by aduboisforge.
- Constellation lines: d3-celestial by Olaf Frohn, BSD-3-Clause. Copyright (c) 2015, Olaf Frohn.
- Place names and coordinates: GeoNames (https://www.geonames.org), CC BY 4.0.
- Ephemeris: astronomy-engine by Don Cross, MIT.
- Typeface: EB Garamond by Georg Duffner and Octavio Pardo, SIL Open Font License 1.1 (public/fonts/OFL-EBGaramond.txt).
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/build-sky-data.mjs app/data/sky public/fonts NOTICE.md
git commit -m "Add star-map data pipeline, fonts and dependencies"
```

---

### Task 2: Sky parameters

**Files:**
- Create: `app/lib/sky/params.ts`
- Test: `scripts/skyParams.node-test.mjs`

- [ ] **Step 1: Failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalSkyParams,
  fromCartAttributes,
  toCartAttributes,
  validateSkyParams,
} from '../app/lib/sky/params.ts';

const input = {
  date: '2019-06-14', time: '22:00', lat: 48.85661, lon: 2.35222,
  tz: 'Europe/Paris', place: 'Paris, France', title: 'The night we met', theme: 'linen',
};

test('validateSkyParams accepts a full set and rounds coordinates', () => {
  const result = validateSkyParams(input);
  assert.equal(result.ok, true);
  assert.equal(result.params.lat, 48.8566);
  assert.equal(result.params.v, 1);
});

test('validateSkyParams rejects bad dates, long titles and unknown zones', () => {
  assert.equal(validateSkyParams({...input, date: '1850-01-01'}).ok, false);
  assert.equal(validateSkyParams({...input, title: 'x'.repeat(41)}).ok, false);
  assert.equal(validateSkyParams({...input, tz: 'Mars/Olympus'}).ok, false);
  assert.equal(validateSkyParams({...input, time: '25:00'}).ok, false);
});

test('canonical string is stable and order-independent', () => {
  const a = validateSkyParams(input).params;
  const b = validateSkyParams({title: input.title, theme: 'linen', place: input.place, tz: input.tz, lon: input.lon, lat: input.lat, time: input.time, date: input.date}).params;
  assert.equal(canonicalSkyParams(a), canonicalSkyParams(b));
  assert.match(canonicalSkyParams(a), /^v=1&date=2019-06-14&time=22:00&lat=48.8566&lon=2.3522&tz=Europe%2FParis&place=Paris%2C%20France&title=The%20night%20we%20met&theme=linen$/);
});

test('cart attributes round-trip and hide internals', () => {
  const params = validateSkyParams(input).params;
  const attrs = toCartAttributes(params, 'sig123');
  assert.deepEqual(attrs.find((a) => a.key === 'Place'), {key: 'Place', value: 'Paris, France'});
  assert.equal(attrs.find((a) => a.key === 'Date').value, '14 June 2019, 22:00');
  assert.equal(attrs.find((a) => a.key === '_sig').value, 'sig123');
  const back = fromCartAttributes(attrs);
  assert.equal(back.ok, true);
  assert.deepEqual(back.params, params);
  assert.equal(back.sig, 'sig123');
  assert.equal(fromCartAttributes([{key: 'Title', value: 'x'}]).ok, false);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/skyParams.node-test.mjs`
Expected: FAIL — cannot find module `params.ts`.

- [ ] **Step 3: Implement**

`app/lib/sky/params.ts`:

```ts
export type SkyThemeId = 'linen' | 'midnight-garden' | 'quiet-form';
export const SKY_THEME_IDS: SkyThemeId[] = ['linen', 'midnight-garden', 'quiet-form'];

export type SkyParams = {
  v: 1;
  date: string; // YYYY-MM-DD (local at place)
  time: string; // HH:MM (local at place)
  lat: number; // 4 dp
  lon: number; // 4 dp
  tz: string; // IANA zone
  place: string; // display label
  title: string; // ≤ 40 chars
  theme: SkyThemeId;
};

export type SkyParamsInput = Partial<Record<keyof Omit<SkyParams, 'v'>, unknown>>;
export type SkyValidation =
  | {ok: true; params: SkyParams}
  | {ok: false; error: string};

export const SKY_TITLE_MAX = 40;
export const SKY_MIN_YEAR = 1900;
export const SKY_MAX_YEAR = 2100;
export const SKY_DEFAULT_TIME = '22:00';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/g;

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: tz});
    return true;
  } catch {
    return false;
  }
}

export function sanitizeTitle(value: unknown) {
  return String(value ?? '').replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim();
}

export function validateSkyParams(input: SkyParamsInput): SkyValidation {
  const date = String(input.date ?? '');
  const m = date.match(DATE_RE);
  if (!m) return {ok: false, error: 'Choose a date.'};
  const year = Number(m[1]);
  const parsed = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[3])));
  if (
    year < SKY_MIN_YEAR || year > SKY_MAX_YEAR ||
    parsed.getUTCMonth() !== Number(m[2]) - 1 || parsed.getUTCDate() !== Number(m[3])
  ) {
    return {ok: false, error: `Choose a date between ${SKY_MIN_YEAR} and ${SKY_MAX_YEAR}.`};
  }
  const time = input.time == null || input.time === '' ? SKY_DEFAULT_TIME : String(input.time);
  if (!TIME_RE.test(time)) return {ok: false, error: 'Choose a time such as 22:00.'};
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return {ok: false, error: 'Choose a place from the list.'};
  }
  const tz = String(input.tz ?? '');
  if (!tz || !isValidTimeZone(tz)) return {ok: false, error: 'Choose a place from the list.'};
  const place = sanitizeTitle(input.place);
  if (!place || place.length > 80) return {ok: false, error: 'Choose a place from the list.'};
  const title = sanitizeTitle(input.title);
  if (title.length > SKY_TITLE_MAX) return {ok: false, error: `Keep the title to ${SKY_TITLE_MAX} characters.`};
  const theme = String(input.theme ?? 'linen') as SkyThemeId;
  if (!SKY_THEME_IDS.includes(theme)) return {ok: false, error: 'Unknown style.'};
  return {ok: true, params: {v: 1, date, time, lat: round4(lat), lon: round4(lon), tz, place, title, theme}};
}

/** Fixed key order; this exact string is what gets signed. */
export function canonicalSkyParams(p: SkyParams) {
  return [
    `v=${p.v}`, `date=${p.date}`, `time=${p.time}`, `lat=${p.lat}`, `lon=${p.lon}`,
    `tz=${encodeURIComponent(p.tz)}`, `place=${encodeURIComponent(p.place)}`,
    `title=${encodeURIComponent(p.title)}`, `theme=${p.theme}`,
  ].join('&');
}

export function parseCanonicalSkyParams(canonical: string): SkyValidation {
  const entries = new URLSearchParams(canonical);
  return validateSkyParams({
    date: entries.get('date'), time: entries.get('time'), lat: entries.get('lat'), lon: entries.get('lon'),
    tz: entries.get('tz'), place: entries.get('place'), title: entries.get('title'), theme: entries.get('theme'),
  });
}

export type CartAttribute = {key: string; value: string};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function formatSkyDate(p: Pick<SkyParams, 'date' | 'time'>) {
  const [y, m, d] = p.date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}, ${p.time}`;
}

export function formatCoordinates(lat: number, lon: number) {
  const f = (n: number, pos: string, neg: string) => `${Math.abs(n).toFixed(4)}° ${n >= 0 ? pos : neg}`;
  return `${f(lat, 'N', 'S')}, ${f(lon, 'E', 'W')}`;
}

export function toCartAttributes(p: SkyParams, sig?: string): CartAttribute[] {
  const attrs: CartAttribute[] = [
    ...(p.title ? [{key: 'Title', value: p.title}] : []),
    {key: 'Place', value: p.place},
    {key: 'Date', value: formatSkyDate(p)},
    {key: '_v', value: String(p.v)},
    {key: '_date', value: p.date},
    {key: '_time', value: p.time},
    {key: '_lat', value: String(p.lat)},
    {key: '_lon', value: String(p.lon)},
    {key: '_tz', value: p.tz},
    {key: '_theme', value: p.theme},
  ];
  if (sig) attrs.push({key: '_sig', value: sig});
  return attrs;
}

export function fromCartAttributes(
  attrs: ReadonlyArray<{key: string; value?: string | null}> | null | undefined,
): (SkyValidation & {ok: true; sig: string | null}) | {ok: false; error: string} {
  const map = new Map((attrs ?? []).map((a) => [a.key, a.value ?? '']));
  if (map.get('_v') !== '1') return {ok: false, error: 'Not a sky line.'};
  const result = validateSkyParams({
    date: map.get('_date'), time: map.get('_time'), lat: map.get('_lat'), lon: map.get('_lon'),
    tz: map.get('_tz'), place: map.get('Place'), title: map.get('Title') ?? '', theme: map.get('_theme'),
  });
  if (!result.ok) return result;
  return {...result, sig: map.get('_sig') ?? null};
}

export function isSkyCartLine(attrs: ReadonlyArray<{key: string}> | null | undefined) {
  return Boolean(attrs?.some((a) => a.key === '_v'));
}
```

- [ ] **Step 4: Run tests** — `node --test scripts/skyParams.node-test.mjs` → PASS (4 tests).

- [ ] **Step 5: Commit** — `git add app/lib/sky/params.ts scripts/skyParams.node-test.mjs && git commit -m "Add sky parameter validation and cart attribute codec"`

---

### Task 3: Signing

**Files:**
- Create: `app/lib/sky/sign.server.ts`
- Test: `scripts/skySign.node-test.mjs`

- [ ] **Step 1: Failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {decodeSkyToken, encodeSkyToken, signCanonical, verifyCanonical} from '../app/lib/sky/sign.server.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const params = validateSkyParams({date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', place: 'Paris, France', title: 'Hello', theme: 'linen'}).params;

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
  assert.equal((await decodeSkyToken('garbage', SECRET)).ok, false);
});
```

- [ ] **Step 2: Run** → FAIL (module missing).

- [ ] **Step 3: Implement** `app/lib/sky/sign.server.ts`:

```ts
import {canonicalSkyParams, parseCanonicalSkyParams, type SkyParams, type SkyValidation} from './params.ts';

const encoder = new TextEncoder();

export function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
}

export async function signCanonical(canonical: string, secret: string) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
  return base64UrlEncode(new Uint8Array(sig));
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCanonical(canonical: string, sig: string, secret: string) {
  const expected = await signCanonical(canonical, secret);
  return timingSafeEqual(expected, sig);
}

export async function signSkyParams(params: SkyParams, secret: string) {
  return signCanonical(canonicalSkyParams(params), secret);
}

export async function encodeSkyToken(params: SkyParams, secret: string) {
  const canonical = canonicalSkyParams(params);
  const sig = await signCanonical(canonical, secret);
  return `${base64UrlEncode(encoder.encode(canonical))}.${sig}`;
}

export async function decodeSkyToken(token: string, secret: string): Promise<SkyValidation> {
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return {ok: false, error: 'Malformed token.'};
  const bytes = base64UrlDecode(body);
  if (!bytes) return {ok: false, error: 'Malformed token.'};
  const canonical = new TextDecoder().decode(bytes);
  if (!(await verifyCanonical(canonical, sig, secret))) return {ok: false, error: 'Bad signature.'};
  const parsed = parseCanonicalSkyParams(canonical);
  if (!parsed.ok) return parsed;
  // The canonical form must survive a re-encode, or the signature covers
  // something other than what we render.
  if (canonicalSkyParams(parsed.params) !== canonical) return {ok: false, error: 'Non-canonical token.'};
  return parsed;
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `git add app/lib/sky/sign.server.ts scripts/skySign.node-test.mjs && git commit -m "Add HMAC signing for sky parameters and print tokens"`

---

### Task 4: Product/SKU map

**Files:**
- Create: `app/lib/sky/products.ts`
- Test: `scripts/skyProducts.node-test.mjs`

- [ ] **Step 1: Failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {SKY_PRODUCT_HANDLE, SKY_SIZES, SKY_VARIANTS, skySizeFromOptions, skyVariantForSku} from '../app/lib/sky/products.ts';

test('six variants map to Prodigi SKUs with frame colour attributes', () => {
  assert.equal(SKY_PRODUCT_HANDLE, 'your-sky-star-map');
  assert.equal(Object.keys(SKY_VARIANTS).length, 6);
  assert.deepEqual(skyVariantForSku('CM-SKY-20X24-BLK'), {size: '20x24', finish: 'black', prodigiSku: 'GLOBAL-CFP-20X24', attributes: {color: 'black'}});
  assert.deepEqual(skyVariantForSku('CM-SKY-8X10-UNF'), {size: '8x10', finish: 'unframed', prodigiSku: 'GLOBAL-FAP-8X10', attributes: {}});
  assert.equal(skyVariantForSku('CM-PRINT-8X10'), null);
  assert.equal(skyVariantForSku(null), null);
});

test('sizes carry points and pixels at 300 dpi', () => {
  assert.deepEqual(SKY_SIZES['8x10'].points, [576, 720]);
  assert.deepEqual(SKY_SIZES['20x24'].pixels, [6000, 7200]);
  assert.equal(skySizeFromOptions([{name: 'Size', value: '20 × 24 in'}]), '20x24');
  assert.equal(skySizeFromOptions([{name: 'Size', value: 'nonsense'}]), '8x10');
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `app/lib/sky/products.ts`:

```ts
export const SKY_PRODUCT_HANDLE = 'your-sky-star-map';
export const SKY_PRODUCT_TYPE = 'Personalised Art';

export type SkySizeKey = '8x10' | '20x24';
export type SkyFinish = 'unframed' | 'natural' | 'black';

export const SKY_SIZES: Record<SkySizeKey, {label: string; optionValue: string; inches: [number, number]; points: [number, number]; pixels: [number, number]}> = {
  '8x10': {label: '8 × 10 in', optionValue: '8 × 10 in', inches: [8, 10], points: [576, 720], pixels: [2400, 3000]},
  '20x24': {label: '20 × 24 in (50 × 60 cm)', optionValue: '20 × 24 in', inches: [20, 24], points: [1440, 1728], pixels: [6000, 7200]},
};

export type SkyVariant = {size: SkySizeKey; finish: SkyFinish; prodigiSku: string; attributes: Record<string, string>};

/** Variant SKU (set on the Shopify variant) → Prodigi SKU + attributes. */
export const SKY_VARIANTS: Record<string, SkyVariant> = {
  'CM-SKY-8X10-UNF': {size: '8x10', finish: 'unframed', prodigiSku: 'GLOBAL-FAP-8X10', attributes: {}},
  'CM-SKY-8X10-NAT': {size: '8x10', finish: 'natural', prodigiSku: 'GLOBAL-CFP-8X10', attributes: {color: 'natural'}},
  'CM-SKY-8X10-BLK': {size: '8x10', finish: 'black', prodigiSku: 'GLOBAL-CFP-8X10', attributes: {color: 'black'}},
  'CM-SKY-20X24-UNF': {size: '20x24', finish: 'unframed', prodigiSku: 'GLOBAL-FAP-20X24', attributes: {}},
  'CM-SKY-20X24-NAT': {size: '20x24', finish: 'natural', prodigiSku: 'GLOBAL-CFP-20X24', attributes: {color: 'natural'}},
  'CM-SKY-20X24-BLK': {size: '20x24', finish: 'black', prodigiSku: 'GLOBAL-CFP-20X24', attributes: {color: 'black'}},
};

export function skyVariantForSku(sku: string | null | undefined): SkyVariant | null {
  if (!sku) return null;
  return SKY_VARIANTS[sku.trim().toUpperCase()] ?? null;
}

export function skySizeFromOptions(options: ReadonlyArray<{name: string; value: string}> | null | undefined): SkySizeKey {
  const value = options?.find((o) => o.name.toLowerCase() === 'size')?.value ?? '';
  return value.replace(/\s/g, '').startsWith('20×24') || value.replace(/\s/g, '').startsWith('20x24') ? '20x24' : '8x10';
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `git add app/lib/sky/products.ts scripts/skyProducts.node-test.mjs && git commit -m "Add star-map variant to Prodigi SKU map"`

---

### Task 5: Time, astronomy, projection, scene

**Files:**
- Create: `app/lib/sky/astronomyEngine.ts`, `app/lib/sky/time.ts`, `app/lib/sky/astro.ts`, `app/lib/sky/projection.ts`, `app/lib/sky/catalog.ts`, `app/lib/sky/moon.ts`, `app/lib/sky/scene.ts`
- Test: `scripts/skyScene.node-test.mjs`

- [ ] **Step 1: Failing tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {localToUtc, tzOffsetMinutes} from '../app/lib/sky/time.ts';
import {altAzFromHourAngle, skyPositions} from '../app/lib/sky/astro.ts';
import {projectAltAz} from '../app/lib/sky/projection.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {loadSkyCatalogSync} from '../app/lib/sky/catalog.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';

test('local wall time converts through IANA zones incl. DST', () => {
  assert.equal(localToUtc('2019-06-14', '22:00', 'Europe/Paris').toISOString(), '2019-06-14T20:00:00.000Z');
  assert.equal(localToUtc('1990-01-01', '00:00', 'Europe/Athens').toISOString(), '1989-12-31T22:00:00.000Z');
  assert.equal(localToUtc('2024-12-31', '23:30', 'Europe/Lisbon').toISOString(), '2024-12-31T23:30:00.000Z');
  assert.equal(tzOffsetMinutes(Date.UTC(2019, 5, 14, 20), 'Europe/Paris'), 120);
});

// Meeus, Astronomical Algorithms, example 13.b: Venus from USNO Washington,
// 1987 April 10, 19:21:00 UT. Apparent α = 23h09m16.641s, δ = −6°43′11.61″.
// Expected A = 68.0337° west of south (→ 248.0337° from north), h = 15.1249°.
test('alt/az from hour angle matches Meeus 13.b', () => {
  const lat = 38 + 55 / 60 + 17 / 3600;
  const lonWest = 77 + 3 / 60 + 56 / 3600;
  const raDeg = (23 + 9 / 60 + 16.641 / 3600) * 15;
  const decDeg = -(6 + 43 / 60 + 11.61 / 3600);
  const gastDeg = 128.7378734; // apparent sidereal time at Greenwich, from the example
  const lstDeg = gastDeg - lonWest;
  const {alt, az} = altAzFromHourAngle(lstDeg - raDeg, decDeg, lat);
  assert.ok(Math.abs(alt - 15.1249) < 0.001, `alt ${alt}`);
  assert.ok(Math.abs(az - 248.0337) < 0.001, `az ${az}`);
});

test('Polaris sits near the pole and the Sun is down at 22:00 in June', () => {
  const catalog = loadSkyCatalogSync();
  const when = localToUtc('2019-06-14', '22:00', 'Europe/Paris');
  const sky = skyPositions({date: when, lat: 48.8566, lon: 2.3522, catalog});
  const polaris = sky.stars.reduce((best, s) => (s.dec > best.dec ? s : best));
  assert.ok(Math.abs(polaris.alt - 48.8566) < 1, `polaris alt ${polaris.alt}`);
  assert.ok(sky.sun.alt < 0);
  assert.ok(sky.stars.some((s) => s.alt > 0));
  assert.equal(typeof sky.moon.phaseFraction, 'number');
});

test('stereographic projection puts the zenith at centre and the horizon on the ring', () => {
  const disc = {cx: 100, cy: 100, r: 50};
  assert.deepEqual(projectAltAz(90, 0, disc), {x: 100, y: 100});
  const north = projectAltAz(0, 0, disc);
  assert.ok(Math.abs(north.x - 100) < 1e-9 && Math.abs(north.y - 50) < 1e-9);
  const east = projectAltAz(0, 90, disc);
  assert.ok(Math.abs(east.x - 50) < 1e-9, 'east is on the left'); 
});

test('computeSky builds a scene in points for both sizes', () => {
  const catalog = loadSkyCatalogSync();
  const params = validateSkyParams({date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', place: 'Paris, France', title: 'The night we met', theme: 'linen'}).params;
  const small = computeSky({params, size: '8x10', catalog});
  assert.equal(small.width, 576);
  assert.equal(small.height, 720);
  assert.ok(small.stars.length > 1500 && small.stars.length < 6000);
  assert.ok(small.stars.every((s) => Math.hypot(s.x - small.disc.cx, s.y - small.disc.cy) <= small.disc.r + 1e-6));
  assert.ok(small.lines.length > 50);
  assert.equal(small.title, 'The night we met');
  assert.equal(small.subtitle, 'PARIS, FRANCE · 14 JUNE 2019 · 48.8566° N, 2.3522° E');
  const large = computeSky({params, size: '20x24', catalog});
  assert.equal(large.width, 1440);
  assert.ok(large.stars[0].r > small.stars[0].r);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement modules**

`app/lib/sky/astronomyEngine.ts`:

```ts
// astronomy-engine ships a UMD main; Node's ESM loader exposes it on
// `default`, Vite exposes named exports. Normalise once here.
import * as AE from 'astronomy-engine';

type AstronomyModule = typeof import('astronomy-engine');
export const Astronomy: AstronomyModule =
  ((AE as unknown as {default?: AstronomyModule}).default ?? (AE as AstronomyModule));
```

`app/lib/sky/time.ts`:

```ts
/** Offset (minutes east of UTC) that `tz` applies at the instant `utcMs`. */
export function tzOffsetMinutes(utcMs: number, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - utcMs) / 60000);
}

/** Wall-clock date/time at a place → UTC instant (two-pass, handles DST). */
export function localToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  let utc = guess - tzOffsetMinutes(guess, tz) * 60000;
  utc = guess - tzOffsetMinutes(utc, tz) * 60000;
  return new Date(utc);
}
```

`app/lib/sky/catalog.ts`:

```ts
export type SkyCatalog = {
  /** Flat [ra°, dec°, mag, ...] sorted bright → faint. */
  stars: ArrayLike<number>;
  /** Flat [ra1, dec1, ra2, dec2, ...] segments. */
  lines: ArrayLike<number>;
};

export async function loadSkyCatalog(): Promise<SkyCatalog> {
  const [stars, lines] = await Promise.all([
    import('../../data/sky/stars.json'),
    import('../../data/sky/constellations.json'),
  ]);
  return {stars: stars.default.data, lines: lines.default.data};
}

/** Synchronous loader for tests/scripts (Node only). */
export function loadSkyCatalogSync(): SkyCatalog {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {readFileSync} = require('node:fs') as typeof import('node:fs');
  const read = (f: string) => JSON.parse(readFileSync(new URL(`../../data/sky/${f}`, import.meta.url), 'utf8')) as {data: number[]};
  return {stars: read('stars.json').data, lines: read('constellations.json').data};
}
```

(If `require` is unavailable under Node ESM type-stripping, replace the sync loader with `import {readFileSync} from 'node:fs'` at top — it is only imported by Node code paths: tests, scripts, and the server PDF route which runs in a worker; the PDF route must use `loadSkyCatalog()` instead. Keep `catalog.ts` free of `node:fs` if the server bundle imports it: put `loadSkyCatalogSync` into `scripts/lib/sky-catalog.mjs` instead and import it from tests. Decide at implementation time; the plan's tests assume the helper lives in `scripts/lib/sky-catalog.mjs` if the worker build complains.)

`app/lib/sky/astro.ts`:

```ts
import {Astronomy} from './astronomyEngine.ts';
import type {SkyCatalog} from './catalog.ts';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type HorizontalPoint = {alt: number; az: number};
export type StarPosition = HorizontalPoint & {mag: number; ra: number; dec: number};
export type SegmentPosition = [HorizontalPoint, HorizontalPoint];
export type BodyPosition = HorizontalPoint & {name: string};
export type MoonPosition = HorizontalPoint & {phaseFraction: number; waxing: boolean};

export type SkyPositions = {
  stars: StarPosition[];
  segments: SegmentPosition[];
  moon: MoonPosition;
  sun: HorizontalPoint;
  planets: BodyPosition[];
};

/** Textbook alt/az from local hour angle (degrees). Azimuth from north, eastward. */
export function altAzFromHourAngle(hourAngleDeg: number, decDeg: number, latDeg: number): HorizontalPoint {
  const H = hourAngleDeg * DEG, d = decDeg * DEG, phi = latDeg * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // Meeus 13.5/13.6 give azimuth west of south; convert to from-north.
  const azSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi));
  const az = ((azSouth * RAD + 180) % 360 + 360) % 360;
  return {alt: alt * RAD, az};
}

function horizontalFromVector(x: number, y: number, z: number): HorizontalPoint {
  // astronomy-engine HOR frame: x north, y west, z zenith.
  const alt = Math.asin(Math.max(-1, Math.min(1, z))) * RAD;
  const az = ((Math.atan2(-y, x) * RAD) % 360 + 360) % 360;
  return {alt, az};
}

export function skyPositions({date, lat, lon, catalog}: {date: Date; lat: number; lon: number; catalog: SkyCatalog}): SkyPositions {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(lat, lon, 0);
  // One rotation J2000 equatorial → horizontal handles precession, nutation
  // and sidereal time for every catalogue star at once.
  const {rot} = Astronomy.Rotation_EQJ_HOR(time, observer);
  const toHorizontal = (raDeg: number, decDeg: number) => {
    const ra = raDeg * DEG, dec = decDeg * DEG, cd = Math.cos(dec);
    const v = [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
    const x = rot[0][0] * v[0] + rot[1][0] * v[1] + rot[2][0] * v[2];
    const y = rot[0][1] * v[0] + rot[1][1] * v[1] + rot[2][1] * v[2];
    const z = rot[0][2] * v[0] + rot[1][2] * v[1] + rot[2][2] * v[2];
    return horizontalFromVector(x, y, z);
  };

  const stars: StarPosition[] = [];
  const s = catalog.stars;
  for (let i = 0; i < s.length; i += 3) {
    const ra = s[i], dec = s[i + 1], mag = s[i + 2];
    stars.push({...toHorizontal(ra, dec), mag, ra, dec});
  }
  const segments: SegmentPosition[] = [];
  const l = catalog.lines;
  for (let i = 0; i < l.length; i += 4) {
    segments.push([toHorizontal(l[i], l[i + 1]), toHorizontal(l[i + 2], l[i + 3])]);
  }

  const body = (name: keyof typeof Astronomy.Body) => {
    const eq = Astronomy.Equator(Astronomy.Body[name], time, observer, true, true);
    const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
    return {alt: hor.altitude, az: hor.azimuth};
  };
  const phaseAngle = Astronomy.MoonPhase(time); // 0 new … 180 full … 360
  const moon: MoonPosition = {
    ...body('Moon'),
    phaseFraction: Astronomy.Illumination(Astronomy.Body.Moon, time).phase_fraction,
    waxing: phaseAngle < 180,
  };
  const planets = (['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const).map((name) => ({name, ...body(name)}));
  return {stars, segments, moon, sun: body('Sun'), planets};
}
```

Note on matrix orientation: astronomy-engine's `RotateVector` computes `rot[0][0]*x + rot[1][0]*y + rot[2][0]*z` for the first component — the code above mirrors that. The Polaris test guards against a transposed matrix (a transposed rotation would put Polaris far from altitude ≈ latitude).

`app/lib/sky/projection.ts`:

```ts
export type Disc = {cx: number; cy: number; r: number};

/** Zenithal stereographic: zenith → centre, horizon → ring, north up, east left. */
export function projectAltAz(altDeg: number, azDeg: number, disc: Disc) {
  const z = (90 - altDeg) * (Math.PI / 180);
  const k = Math.tan(z / 2); // 0 at zenith, 1 at horizon
  const az = azDeg * (Math.PI / 180);
  return {x: disc.cx - disc.r * k * Math.sin(az), y: disc.cy - disc.r * k * Math.cos(az)};
}

export type SkyLayout = {
  width: number; height: number; scale: number; disc: Disc;
  titleY: number; subtitleY: number; creditY: number; titleSize: number; subtitleSize: number; creditSize: number;
};

/** Shared proportions for both print sizes; `scale` = width / 576. */
export function layoutFor(width: number, height: number): SkyLayout {
  const scale = width / 576;
  const r = Math.min(width * 0.4, height * 0.32);
  return {
    width, height, scale,
    disc: {cx: width / 2, cy: height * 0.4, r},
    titleY: height * 0.79, subtitleY: height * 0.835, creditY: height * 0.95,
    titleSize: 30 * scale, subtitleSize: 9.5 * scale, creditSize: 7 * scale,
  };
}

export function starRadius(mag: number, scale: number) {
  const base = mag <= 0 ? 2.6 : mag <= 1 ? 2.1 : mag <= 2 ? 1.7 : mag <= 3 ? 1.3 : mag <= 4 ? 0.95 : mag <= 5 ? 0.65 : 0.42;
  return base * scale;
}
```

`app/lib/sky/moon.ts`:

```ts
/**
 * SVG path for a moon disc of radius R centred at (cx, cy) showing the lit
 * fraction f (0..1). `litRight` = bright limb on the right.
 */
export function moonLitPath(cx: number, cy: number, R: number, f: number, litRight: boolean) {
  const frac = Math.max(0, Math.min(1, f));
  if (frac <= 0.005) return '';
  if (frac >= 0.995) return `M ${cx - R} ${cy} A ${R} ${R} 0 1 0 ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx - R} ${cy} Z`;
  const dir = litRight ? 1 : -1;
  const top = `${cx} ${cy - R}`, bottom = `${cx} ${cy + R}`;
  // Outer limb: half circle on the lit side.
  const limb = `M ${top} A ${R} ${R} 0 0 ${dir > 0 ? 1 : 0} ${bottom}`;
  // Terminator: ellipse with semi-minor axis |2f-1|R, bulging toward the lit
  // side when f > 0.5 (gibbous) and away when f < 0.5 (crescent).
  const rx = Math.abs(2 * frac - 1) * R;
  const sweep = (frac > 0.5 ? dir > 0 : dir < 0) ? 0 : 1;
  const terminator = `A ${rx} ${R} 0 0 ${sweep} ${top}`;
  return `${limb} ${terminator} Z`;
}
```

`app/lib/sky/scene.ts`:

```ts
import type {SkyCatalog} from './catalog.ts';
import {formatCoordinates, type SkyParams} from './params.ts';
import {layoutFor, projectAltAz, starRadius, type SkyLayout} from './projection.ts';
import {SKY_SIZES, type SkySizeKey} from './products.ts';
import {skyPositions} from './astro.ts';
import {localToUtc} from './time.ts';

export type SceneStar = {x: number; y: number; r: number; mag: number};
export type SceneLine = {x1: number; y1: number; x2: number; y2: number};
export type SceneBody = {x: number; y: number; r: number; name: string};
export type SceneMoon = {x: number; y: number; r: number; phaseFraction: number; litRight: boolean};

export type SkyScene = SkyLayout & {
  stars: SceneStar[];
  lines: SceneLine[];
  moon: SceneMoon | null;
  planets: SceneBody[];
  title: string;
  subtitle: string;
  credit: string;
  cardinal: Array<{label: string; x: number; y: number}>;
};

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

export function skySubtitle(p: SkyParams) {
  const [y, m, d] = p.date.split('-').map(Number);
  return `${p.place.toUpperCase()} · ${d} ${MONTHS[m - 1]} ${y} · ${formatCoordinates(p.lat, p.lon)}`;
}

export function computeSky({params, size, catalog}: {params: SkyParams; size: SkySizeKey; catalog: SkyCatalog}): SkyScene {
  const [width, height] = SKY_SIZES[size].points;
  const layout = layoutFor(width, height);
  const {disc, scale} = layout;
  const when = localToUtc(params.date, params.time, params.tz);
  const sky = skyPositions({date: when, lat: params.lat, lon: params.lon, catalog});

  const stars: SceneStar[] = [];
  for (const s of sky.stars) {
    if (s.alt <= 0) continue;
    const {x, y} = projectAltAz(s.alt, s.az, disc);
    stars.push({x, y, r: starRadius(s.mag, scale), mag: s.mag});
  }
  const lines: SceneLine[] = [];
  for (const [a, b] of sky.segments) {
    if (a.alt <= 0 || b.alt <= 0) continue;
    const p = projectAltAz(a.alt, a.az, disc), q = projectAltAz(b.alt, b.az, disc);
    lines.push({x1: p.x, y1: p.y, x2: q.x, y2: q.y});
  }
  const moon = sky.moon.alt > 0
    ? {...projectAltAz(sky.moon.alt, sky.moon.az, disc), r: 7 * scale, phaseFraction: sky.moon.phaseFraction,
       // Northern hemisphere: a waxing Moon is lit on its right (west) side.
       litRight: params.lat >= 0 ? sky.moon.waxing : !sky.moon.waxing}
    : null;
  const planets = sky.planets.filter((p) => p.alt > 0).map((p) => ({...projectAltAz(p.alt, p.az, disc), r: 2.2 * scale, name: p.name}));
  const cardinal = [
    {label: 'N', x: disc.cx, y: disc.cy - disc.r - 9 * scale},
    {label: 'S', x: disc.cx, y: disc.cy + disc.r + 16 * scale},
    {label: 'E', x: disc.cx - disc.r - 12 * scale, y: disc.cy + 3 * scale},
    {label: 'W', x: disc.cx + disc.r + 12 * scale, y: disc.cy + 3 * scale},
  ];
  return {
    ...layout, stars, lines, moon, planets, cardinal,
    title: params.title, subtitle: skySubtitle(params), credit: 'CLARA MENDES · YOUR SKY',
  };
}
```

- [ ] **Step 4: Run** `node --test scripts/skyScene.node-test.mjs` → PASS (5 tests). If the Meeus test fails by exactly 180° in azimuth, the from-south conversion is wrong; if Polaris altitude is off by tens of degrees, transpose the matrix indices.

- [ ] **Step 5: Commit** — `git add app/lib/sky/astronomyEngine.ts app/lib/sky/time.ts app/lib/sky/astro.ts app/lib/sky/projection.ts app/lib/sky/catalog.ts app/lib/sky/moon.ts app/lib/sky/scene.ts scripts/skyScene.node-test.mjs && git commit -m "Add sky scene model: time zones, positions, projection"`

---

### Task 6: Themes and background plates

**Files:**
- Create: `app/lib/sky/themes.ts`, `scripts/generate-sky-plates.mjs`, `public/sky/plates/*.jpg`

- [ ] **Step 1: Themes**

```ts
import type {SkyThemeId} from './params.ts';

export type SkyTheme = {
  id: SkyThemeId; label: string;
  background: string; // flat fallback when the plate is unavailable
  disc: string | null; discOpacity: number; // optional tint inside the horizon ring
  star: string; halo: string; line: string; lineOpacity: number;
  ring: string; ringOpacity: number; moonLit: string; moonDark: string; planet: string;
  title: string; subtitle: string; credit: string; cardinal: string;
};

export const SKY_THEMES: Record<SkyThemeId, SkyTheme> = {
  linen: {
    id: 'linen', label: 'Linen', background: '#efe8dc', disc: '#e7dfd1', discOpacity: 0.55,
    star: '#26231f', halo: '#26231f', line: '#3c3831', lineOpacity: 0.45, ring: '#9c6f5d', ringOpacity: 0.8,
    moonLit: '#26231f', moonDark: '#efe8dc', planet: '#9c6f5d', title: '#26231f', subtitle: '#746f65', credit: '#9c6f5d', cardinal: '#746f65',
  },
  'midnight-garden': {
    id: 'midnight-garden', label: 'Midnight Garden', background: '#141b2b', disc: '#0e1422', discOpacity: 0.6,
    star: '#f1e3b8', halo: '#f1e3b8', line: '#c9b98a', lineOpacity: 0.4, ring: '#b08d57', ringOpacity: 0.85,
    moonLit: '#f1e3b8', moonDark: '#141b2b', planet: '#d9a066', title: '#f4ecd8', subtitle: '#b7ad93', credit: '#b08d57', cardinal: '#b7ad93',
  },
  'quiet-form': {
    id: 'quiet-form', label: 'Quiet Form', background: '#f6f2ea', disc: '#dfd3c3', discOpacity: 1,
    star: '#2b2622', halo: '#2b2622', line: '#5a4f44', lineOpacity: 0.4, ring: '#c9a58b', ringOpacity: 1,
    moonLit: '#2b2622', moonDark: '#dfd3c3', planet: '#a2735b', title: '#2b2622', subtitle: '#7b7166', credit: '#a2735b', cardinal: '#7b7166',
  },
};

export const DEFAULT_SKY_THEME: SkyThemeId = 'linen';
export const PLATE_PATH = (id: SkyThemeId, variant: 'print' | 'preview') => `/sky/plates/${id}${variant === 'preview' ? '-preview' : ''}.jpg`;
```

- [ ] **Step 2: Plate generator** `scripts/generate-sky-plates.mjs` (sharp is already a dependency):

```js
#!/usr/bin/env node
// Painterly background plates: layered radial gradients + gaussian grain.
// One 3000×3600 JPEG per theme (≈150 dpi on the 20×24 sheet — fine for a
// soft ground) plus a 1200×1440 preview.
import sharp from 'sharp';
import {mkdirSync} from 'node:fs';

const W = 3000, H = 3600;
const THEMES = {
  linen: {base: '#efe8dc', blobs: [['#f7f1e6', 0.5, 0.35, 0.9], ['#e3d8c6', 0.2, 0.8, 0.7], ['#d9c9b3', 0.85, 0.9, 0.6]], grain: 14},
  'midnight-garden': {base: '#141b2b', blobs: [['#223252', 0.35, 0.3, 0.9], ['#2b2f4a', 0.75, 0.55, 0.8], ['#0c1020', 0.5, 0.95, 0.9], ['#3a3557', 0.15, 0.7, 0.5]], grain: 10},
  'quiet-form': {base: '#f6f2ea', blobs: [['#fbf8f2', 0.5, 0.4, 1], ['#ece3d6', 0.1, 0.85, 0.6], ['#e9dccb', 0.9, 0.15, 0.5]], grain: 9},
};

mkdirSync('public/sky/plates', {recursive: true});
for (const [id, t] of Object.entries(THEMES)) {
  const gradients = t.blobs.map(([c, x, y, r], i) =>
    `<radialGradient id="g${i}" cx="${x}" cy="${y}" r="${r}"><stop offset="0" stop-color="${c}" stop-opacity="0.9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('');
  const rects = t.blobs.map((_, i) => `<rect width="${W}" height="${H}" fill="url(#g${i})"/>`).join('');
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${gradients}</defs><rect width="${W}" height="${H}" fill="${t.base}"/>${rects}</svg>`);
  const grain = await sharp({create: {width: W, height: H, channels: 3, noise: {type: 'gaussian', mean: 128, sigma: t.grain}}}).png().toBuffer();
  const plate = sharp(svg).composite([{input: grain, blend: 'soft-light'}]).blur(0.6);
  await plate.clone().jpeg({quality: 82, mozjpeg: true}).toFile(`public/sky/plates/${id}.jpg`);
  await plate.clone().resize(1200, 1440).jpeg({quality: 80, mozjpeg: true}).toFile(`public/sky/plates/${id}-preview.jpg`);
  console.log('plate', id);
}
```

- [ ] **Step 3: Run** `node scripts/generate-sky-plates.mjs`; add `"sky:plates": "node scripts/generate-sky-plates.mjs"`. Expected: six JPEGs; print plates ≤ 1.5 MB each (check with `ls -la public/sky/plates`). View each preview with the Read tool to confirm they look painterly, not banded.

- [ ] **Step 4: Commit** — `git add app/lib/sky/themes.ts scripts/generate-sky-plates.mjs public/sky/plates package.json && git commit -m "Add star-map themes and background plates"`

---

### Task 7: PDF renderer + local render script

**Files:**
- Create: `app/lib/sky/pdf.server.ts`, `scripts/sky-render-local.mjs`
- Test: `scripts/skyPdf.node-test.mjs`

- [ ] **Step 1: Failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {computeSky} from '../app/lib/sky/scene.ts';
import {loadSkyCatalogSync} from '../app/lib/sky/catalog.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';

const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
  italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
};
const plate = new Uint8Array(readFileSync('public/sky/plates/linen.jpg'));
const catalog = loadSkyCatalogSync();
const params = validateSkyParams({date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', place: 'Paris, France', title: 'Ωμέγα & Жизнь — the night we met', theme: 'linen'}).params;

test('renders both sizes with exact page geometry and embedded font', async () => {
  for (const [size, w, h] of [['8x10', 576, 720], ['20x24', 1440, 1728]]) {
    const scene = computeSky({params, size, catalog});
    const pdf = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate, createdAt: new Date('2019-06-14T20:00:00Z')});
    const text = Buffer.from(pdf).toString('latin1');
    assert.match(text, new RegExp(`/MediaBox \\[0 0 ${w} ${h}\\]`));
    assert.match(text, /EBGaramond/);
    assert.ok(pdf.byteLength < 3 * 1024 * 1024, `size ${pdf.byteLength}`);
  }
});

test('render is deterministic and survives a missing plate', async () => {
  const scene = computeSky({params, size: '8x10', catalog});
  const a = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt: new Date('2019-06-14T20:00:00Z')});
  const b = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate: null, createdAt: new Date('2019-06-14T20:00:00Z')});
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `app/lib/sky/pdf.server.ts`:

```ts
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, rgb, type PDFFont, type PDFPage} from 'pdf-lib';
import {moonLitPath} from './moon.ts';
import type {SkyScene} from './scene.ts';
import type {SkyTheme} from './themes.ts';

export type SkyFonts = {regular: Uint8Array; italic: Uint8Array};

function hex(color: string) {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Draw text centred at x with manual tracking (pdf-lib has no letter-spacing). */
function drawTracked(page: PDFPage, text: string, {x, y, size, font, color, tracking}: {x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; tracking: number}) {
  const chars = [...text];
  const width = chars.reduce((w, c) => w + font.widthOfTextAtSize(c, size), 0) + tracking * (chars.length - 1);
  let cursor = x - width / 2;
  for (const c of chars) {
    page.drawText(c, {x: cursor, y, size, font, color});
    cursor += font.widthOfTextAtSize(c, size) + tracking;
  }
}

export async function renderSkyPdf({scene, theme, fonts, plate, createdAt}: {scene: SkyScene; theme: SkyTheme; fonts: SkyFonts; plate: Uint8Array | null; createdAt: Date}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('Your Sky — Clara Mendes');
  doc.setProducer('Clara Mendes');
  doc.setCreator('Your Sky');
  doc.setCreationDate(createdAt);
  doc.setModificationDate(createdAt);
  const regular = await doc.embedFont(fonts.regular, {subset: true});
  const italic = await doc.embedFont(fonts.italic, {subset: true});
  const {width: W, height: H, disc, scale} = scene;
  const page = doc.addPage([W, H]);
  const Y = (y: number) => H - y; // scene y grows downward

  page.drawRectangle({x: 0, y: 0, width: W, height: H, color: hex(theme.background)});
  if (plate) {
    const image = await doc.embedJpg(plate);
    // Cover the page (fill, centre-crop) like CSS object-fit: cover.
    const ratio = Math.max(W / image.width, H / image.height);
    const w = image.width * ratio, h = image.height * ratio;
    page.drawImage(image, {x: (W - w) / 2, y: (H - h) / 2, width: w, height: h});
  }
  if (theme.disc) {
    page.drawCircle({x: disc.cx, y: Y(disc.cy), size: disc.r, color: hex(theme.disc), opacity: theme.discOpacity});
  }
  for (const line of scene.lines) {
    page.drawLine({start: {x: line.x1, y: Y(line.y1)}, end: {x: line.x2, y: Y(line.y2)}, thickness: 0.35 * scale, color: hex(theme.line), opacity: theme.lineOpacity});
  }
  for (const star of scene.stars) {
    if (star.mag < 1.5) {
      page.drawCircle({x: star.x, y: Y(star.y), size: star.r * 2.4, color: hex(theme.halo), opacity: 0.12});
    }
    page.drawCircle({x: star.x, y: Y(star.y), size: star.r, color: hex(theme.star)});
  }
  for (const planet of scene.planets) {
    page.drawCircle({x: planet.x, y: Y(planet.y), size: planet.r, color: hex(theme.planet)});
  }
  if (scene.moon) {
    const m = scene.moon;
    page.drawCircle({x: m.x, y: Y(m.y), size: m.r, color: hex(theme.moonDark), borderColor: hex(theme.moonLit), borderWidth: 0.4 * scale});
    const path = moonLitPath(m.x, m.y, m.r, m.phaseFraction, m.litRight);
    if (path) page.drawSvgPath(path, {x: 0, y: H, color: hex(theme.moonLit)});
  }
  page.drawCircle({x: disc.cx, y: Y(disc.cy), size: disc.r, borderColor: hex(theme.ring), borderWidth: 0.6 * scale, opacity: 0, borderOpacity: theme.ringOpacity});
  for (const c of scene.cardinal) {
    const size = 7 * scale;
    page.drawText(c.label, {x: c.x - regular.widthOfTextAtSize(c.label, size) / 2, y: Y(c.y), size, font: regular, color: hex(theme.cardinal)});
  }
  if (scene.title) {
    page.drawText(scene.title, {x: (W - italic.widthOfTextAtSize(scene.title, scene.titleSize)) / 2, y: Y(scene.titleY), size: scene.titleSize, font: italic, color: hex(theme.title)});
  }
  drawTracked(page, scene.subtitle, {x: W / 2, y: Y(scene.subtitleY), size: scene.subtitleSize, font: regular, color: hex(theme.subtitle), tracking: 1.6 * scale});
  drawTracked(page, scene.credit, {x: W / 2, y: Y(scene.creditY), size: scene.creditSize, font: regular, color: hex(theme.credit), tracking: 1.8 * scale});

  return doc.save({useObjectStreams: false, addDefaultPage: false});
}
```

Note: `drawSvgPath` interprets the path in a top-left coordinate system anchored at `{x, y}`; passing `y: H` makes scene coordinates line up with the flipped page. If the moon renders upside-down relative to the stars, that assumption is wrong — switch to `y: 0` and pass a pre-flipped path (`moonLitPath(m.x, Y(m.y), …)`).

- [ ] **Step 4: Run** → PASS. If the deterministic test fails, pdf-lib is stamping a random trailer ID — set `doc.context.trailerInfo.ID = undefined` before save or compare sizes instead, and note it in the spec.

- [ ] **Step 5: Local render script** `scripts/sky-render-local.mjs`:

```js
#!/usr/bin/env node
// Usage: node scripts/sky-render-local.mjs --date 2019-06-14 --time 22:00 --lat 48.8566 --lon 2.3522 --tz Europe/Paris --place "Paris, France" --title "The night we met" --theme linen --size 8x10 --out output/sky/test.pdf
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {parseArgs} from 'node:util';
import {computeSky} from '../app/lib/sky/scene.ts';
import {loadSkyCatalogSync} from '../app/lib/sky/catalog.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';

const {values: a} = parseArgs({options: {date: {type: 'string'}, time: {type: 'string', default: '22:00'}, lat: {type: 'string'}, lon: {type: 'string'}, tz: {type: 'string'}, place: {type: 'string'}, title: {type: 'string', default: ''}, theme: {type: 'string', default: 'linen'}, size: {type: 'string', default: '8x10'}, out: {type: 'string', default: 'output/sky/render.pdf'}}});
const v = validateSkyParams(a);
if (!v.ok) { console.error(v.error); process.exit(1); }
const scene = computeSky({params: v.params, size: a.size, catalog: loadSkyCatalogSync()});
const pdf = await renderSkyPdf({
  scene, theme: SKY_THEMES[v.params.theme],
  fonts: {regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')), italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf'))},
  plate: new Uint8Array(readFileSync(`public/sky/plates/${v.params.theme}.jpg`)),
  createdAt: new Date(`${v.params.date}T00:00:00Z`),
});
mkdirSync(dirname(a.out), {recursive: true});
writeFileSync(a.out, pdf);
console.log(`${a.out} (${(pdf.byteLength / 1024).toFixed(0)} KB, ${scene.stars.length} stars)`);
```

Run it for all three themes × two sizes into `output/sky/` (gitignored `output/` already) and **look at each PDF with the Read tool**. Adjust theme colours / star sizes until the three directions read well; this is the material the owner picks from.

- [ ] **Step 6: Commit** — `git add app/lib/sky/pdf.server.ts scripts/sky-render-local.mjs scripts/skyPdf.node-test.mjs && git commit -m "Add vector PDF renderer for star maps"`

---

### Task 8: Place search

**Files:**
- Create: `app/lib/sky/places.server.ts`, `app/routes/api.places.tsx`
- Test: `scripts/skyPlaces.node-test.mjs`

- [ ] **Step 1: Failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizePlaceQuery, searchPlaces} from '../app/lib/sky/places.server.ts';

test('normalises diacritics and case', () => {
  assert.equal(normalizePlaceQuery('  Zürich '), 'zurich');
  assert.equal(normalizePlaceQuery('São Paulo'), 'sao paulo');
});

test('finds cities by prefix, ranked by population, with country names and zones', () => {
  const results = searchPlaces('par');
  assert.equal(results[0].name, 'Paris');
  assert.equal(results[0].country, 'France');
  assert.equal(results[0].tz, 'Europe/Paris');
  assert.equal(results[0].label, 'Paris, France');
  assert.ok(results.length <= 8);
  assert.equal(searchPlaces('athina')[0].tz, 'Europe/Athens');
  assert.equal(searchPlaces('zurich')[0].country, 'Switzerland');
  assert.deepEqual(searchPlaces('x'), []);
  assert.deepEqual(searchPlaces('zzzzqqq'), []);
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `app/lib/sky/places.server.ts`:

```ts
import placesJson from '../../data/sky/places.json';

export type PlaceResult = {name: string; country: string; countryCode: string; lat: number; lon: number; tz: string; label: string};

type Row = [string, string, string, number, number, number, number];
const {tz: ZONES, data: ROWS} = placesJson as {tz: string[]; data: Row[]};
const regionNames = new Intl.DisplayNames(['en'], {type: 'region'});

export function normalizePlaceQuery(q: string) {
  return q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Built once per isolate: normalised name + ascii name per row.
const INDEX: Array<[string, string]> = ROWS.map((r) => [normalizePlaceQuery(r[0]), normalizePlaceQuery(r[1])]);

export function searchPlaces(query: string, limit = 8): PlaceResult[] {
  const q = normalizePlaceQuery(query);
  if (q.length < 2) return [];
  const out: PlaceResult[] = [];
  for (let i = 0; i < ROWS.length && out.length < limit; i++) {
    const [n, a] = INDEX[i];
    if (n.startsWith(q) || a.startsWith(q) || n.includes(` ${q}`) || a.includes(` ${q}`)) {
      const r = ROWS[i];
      const country = regionNames.of(r[2]) ?? r[2];
      out.push({name: r[0], country, countryCode: r[2], lat: r[3], lon: r[4], tz: ZONES[r[5]], label: `${r[0]}, ${country}`});
    }
  }
  return out;
}
```

(`ROWS` is pre-sorted by population in the build script, so the first matches are the biggest cities.)

`app/routes/api.places.tsx`:

```tsx
import {data} from 'react-router';
import type {Route} from './+types/api.places';
import {searchPlaces} from '~/lib/sky/places.server';

export async function loader({request}: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return data({results: searchPlaces(q)}, {headers: {'Cache-Control': 'public, max-age=3600, s-maxage=86400'}});
}
```

- [ ] **Step 4: Run** → PASS. If `import placesJson from '../../data/sky/places.json'` fails under Node without an import attribute, add `with {type: 'json'}` (Vite accepts it too).

- [ ] **Step 5: Commit** — `git add app/lib/sky/places.server.ts app/routes/api.places.tsx scripts/skyPlaces.node-test.mjs && git commit -m "Add offline place search for the star map"`

---

### Task 9: SVG preview + configurator + styles

**Files:**
- Create: `app/lib/sky/svg.tsx`, `app/components/SkyConfigurator.tsx`
- Modify: `app/styles/app.css` (append), `app/lib/csp.ts` (no change expected; run the csp test)

- [ ] **Step 1: SVG renderer** `app/lib/sky/svg.tsx`:

```tsx
import {moonLitPath} from './moon';
import type {SkyScene} from './scene';
import type {SkyTheme} from './themes';

export function SkySvg({scene, theme, plateUrl, className}: {scene: SkyScene; theme: SkyTheme; plateUrl: string | null; className?: string}) {
  const {width: W, height: H, disc, scale} = scene;
  const font = "'EB Garamond', Georgia, 'Times New Roman', serif";
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Star map preview: ${scene.subtitle}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.background} />
      {plateUrl ? <image href={plateUrl} width={W} height={H} preserveAspectRatio="xMidYMid slice" /> : null}
      {theme.disc ? <circle cx={disc.cx} cy={disc.cy} r={disc.r} fill={theme.disc} opacity={theme.discOpacity} /> : null}
      <g stroke={theme.line} strokeOpacity={theme.lineOpacity} strokeWidth={0.35 * scale} strokeLinecap="round">
        {scene.lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
      </g>
      <g fill={theme.star}>
        {scene.stars.map((s, i) => (
          <g key={i}>
            {s.mag < 1.5 ? <circle cx={s.x} cy={s.y} r={s.r * 2.4} fill={theme.halo} opacity={0.12} /> : null}
            <circle cx={s.x} cy={s.y} r={s.r} />
          </g>
        ))}
      </g>
      <g fill={theme.planet}>{scene.planets.map((p) => <circle key={p.name} cx={p.x} cy={p.y} r={p.r} />)}</g>
      {scene.moon ? (
        <g>
          <circle cx={scene.moon.x} cy={scene.moon.y} r={scene.moon.r} fill={theme.moonDark} stroke={theme.moonLit} strokeWidth={0.4 * scale} />
          <path d={moonLitPath(scene.moon.x, scene.moon.y, scene.moon.r, scene.moon.phaseFraction, scene.moon.litRight)} fill={theme.moonLit} />
        </g>
      ) : null}
      <circle cx={disc.cx} cy={disc.cy} r={disc.r} fill="none" stroke={theme.ring} strokeOpacity={theme.ringOpacity} strokeWidth={0.6 * scale} />
      <g fill={theme.cardinal} fontFamily={font} fontSize={7 * scale} textAnchor="middle">
        {scene.cardinal.map((c) => <text key={c.label} x={c.x} y={c.y}>{c.label}</text>)}
      </g>
      {scene.title ? <text x={W / 2} y={scene.titleY} fill={theme.title} fontFamily={font} fontStyle="italic" fontSize={scene.titleSize} textAnchor="middle">{scene.title}</text> : null}
      <text x={W / 2} y={scene.subtitleY} fill={theme.subtitle} fontFamily={font} fontSize={scene.subtitleSize} letterSpacing={1.6 * scale} textAnchor="middle">{scene.subtitle}</text>
      <text x={W / 2} y={scene.creditY} fill={theme.credit} fontFamily={font} fontSize={scene.creditSize} letterSpacing={1.8 * scale} textAnchor="middle">{scene.credit}</text>
    </svg>
  );
}
```

- [ ] **Step 2: Configurator** `app/components/SkyConfigurator.tsx`:

```tsx
import {useEffect, useMemo, useRef, useState} from 'react';
import type {SkyCatalog} from '~/lib/sky/catalog';
import {loadSkyCatalog} from '~/lib/sky/catalog';
import {SKY_DEFAULT_TIME, SKY_MAX_YEAR, SKY_MIN_YEAR, SKY_TITLE_MAX, validateSkyParams, type SkyParams, type SkyThemeId} from '~/lib/sky/params';
import type {PlaceResult} from '~/lib/sky/places.server';
import {computeSky} from '~/lib/sky/scene';
import type {SkySizeKey} from '~/lib/sky/products';
import {PLATE_PATH, SKY_THEMES} from '~/lib/sky/themes';
import {SkySvg} from '~/lib/sky/svg';

const EXAMPLE = {date: '2019-06-14', time: SKY_DEFAULT_TIME, title: 'The night we met'};
const EXAMPLE_PLACE: PlaceResult = {name: 'Paris', country: 'France', countryCode: 'FR', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', label: 'Paris, France'};

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function SkyConfigurator({size, theme, onChange}: {size: SkySizeKey; theme: SkyThemeId; onChange: (params: SkyParams | null) => void}) {
  const [catalog, setCatalog] = useState<SkyCatalog | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(SKY_DEFAULT_TIME);
  const [title, setTitle] = useState('');
  const [touched, setTouched] = useState(false);
  const listId = 'sky-place-results';
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    loadSkyCatalog().then((c) => alive && setCatalog(c)).catch((e) => console.error('Sky catalogue failed to load', e));
    return () => { alive = false; };
  }, []);

  const debouncedQuery = useDebounced(placeQuery, 200);
  useEffect(() => {
    abortRef.current?.abort();
    if (debouncedQuery.trim().length < 2 || place?.label === debouncedQuery) { setPlaceResults([]); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    fetch(`/api/places?q=${encodeURIComponent(debouncedQuery)}`, {signal: controller.signal})
      .then((r) => (r.ok ? r.json() : {results: []}))
      .then((json: {results: PlaceResult[]}) => { setPlaceResults(json.results); setPlacesOpen(true); })
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedQuery, place?.label]);

  // What the preview shows: the customer's sky once they have a date + place,
  // the example sky until then (so the page never looks empty).
  const previewInput = useMemo(() => {
    const p = place ?? EXAMPLE_PLACE;
    return {date: date || EXAMPLE.date, time: time || SKY_DEFAULT_TIME, lat: p.lat, lon: p.lon, tz: p.tz, place: p.label, title: touched || title ? title : EXAMPLE.title, theme};
  }, [date, place, theme, time, title, touched]);
  const debouncedInput = useDebounced(previewInput, 150);
  const validation = useMemo(() => validateSkyParams(debouncedInput), [debouncedInput]);
  const scene = useMemo(() => (catalog && validation.ok ? computeSky({params: validation.params, size, catalog}) : null), [catalog, size, validation]);

  // Only a complete, customer-entered set is purchasable.
  const purchasable = useMemo(() => (place && date ? validateSkyParams({date, time, lat: place.lat, lon: place.lon, tz: place.tz, place: place.label, title, theme}) : null), [date, place, theme, time, title]);
  useEffect(() => { onChange(purchasable?.ok ? purchasable.params : null); }, [onChange, purchasable]);

  const error = touched && purchasable && !purchasable.ok ? purchasable.error : touched && !place ? 'Choose a place from the list.' : touched && !date ? 'Choose a date.' : null;

  return (
    <div className="sky-configurator">
      <div className="sky-preview" aria-live="polite">
        {scene ? <SkySvg scene={scene} theme={SKY_THEMES[theme]} plateUrl={PLATE_PATH(theme, 'preview')} className="sky-preview-svg" /> : <div className="sky-preview-loading">Charting the sky…</div>}
        {!place || !date ? <p className="sky-preview-hint">Showing an example — add your place and date to see your sky.</p> : null}
      </div>
      <form className="sky-form" onSubmit={(e) => e.preventDefault()} aria-label="Personalise your star map">
        <label className="sky-field">
          <span>Place</span>
          <input type="text" value={placeQuery} autoComplete="off" role="combobox" aria-expanded={placesOpen && placeResults.length > 0} aria-controls={listId} aria-autocomplete="list" placeholder="City or town"
            onChange={(e) => { setPlaceQuery(e.target.value); setPlace(null); setTouched(true); }}
            onFocus={() => setPlacesOpen(true)} onBlur={() => window.setTimeout(() => setPlacesOpen(false), 150)} />
          {placesOpen && placeResults.length > 0 ? (
            <ul id={listId} className="sky-place-results" role="listbox">
              {placeResults.map((r) => (
                <li key={`${r.name}-${r.lat}-${r.lon}`} role="option" aria-selected={place?.label === r.label}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPlace(r); setPlaceQuery(r.label); setPlaceResults([]); setPlacesOpen(false); }}>
                    {r.name}<small>{r.country}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {place ? <small className="sky-field-note">{place.lat.toFixed(4)}° {place.lat >= 0 ? 'N' : 'S'}, {Math.abs(place.lon).toFixed(4)}° {place.lon >= 0 ? 'E' : 'W'} · {place.tz}</small> : null}
        </label>
        <div className="sky-field-row">
          <label className="sky-field"><span>Date</span>
            <input type="date" value={date} min={`${SKY_MIN_YEAR}-01-01`} max={`${SKY_MAX_YEAR}-12-31`} onChange={(e) => { setDate(e.target.value); setTouched(true); }} />
          </label>
          <label className="sky-field"><span>Time <em>(local)</em></span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value || SKY_DEFAULT_TIME)} />
          </label>
        </div>
        <label className="sky-field"><span>Title <em>(optional, {SKY_TITLE_MAX} characters)</em></span>
          <input type="text" value={title} maxLength={SKY_TITLE_MAX} placeholder={EXAMPLE.title} onChange={(e) => { setTitle(e.target.value); setTouched(true); }} />
        </label>
        {error ? <p className="sky-form-error" role="alert">{error}</p> : null}
        <p className="sky-form-note">Leave the time as it is for the evening sky, or set the exact hour. Stars are shown as they stood above the horizon, even by day.</p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Styles** — append to `app/styles/app.css`:

```css
/* --- Your Sky: personalised star map ----------------------------------- */
@font-face { font-family: 'EB Garamond'; font-style: normal; font-weight: 400; font-display: swap; src: url('/fonts/EBGaramond-Regular.ttf') format('truetype'); }
@font-face { font-family: 'EB Garamond'; font-style: italic; font-weight: 400; font-display: swap; src: url('/fonts/EBGaramond-Italic.ttf') format('truetype'); }

.sky-configurator { display: grid; gap: 1.25rem; }
.sky-preview { position: relative; background: var(--color-soft); border-radius: 6px; box-shadow: 0 24px 60px rgba(55, 48, 39, 0.16); overflow: hidden; }
.sky-preview-svg { display: block; width: 100%; height: auto; }
.sky-preview-loading { aspect-ratio: 4 / 5; display: grid; place-items: center; color: var(--color-muted); font-family: var(--serif); font-style: italic; }
.sky-preview-hint { position: absolute; inset: auto 0 0 0; margin: 0; padding: 0.5rem 0.75rem; font-size: 0.78rem; color: var(--color-paper); background: rgba(38, 35, 31, 0.72); }
.sky-form { display: grid; gap: 0.9rem; }
.sky-field { position: relative; display: grid; gap: 0.35rem; font-size: 0.86rem; }
.sky-field > span { color: var(--color-muted); letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.72rem; }
.sky-field em { text-transform: none; letter-spacing: 0; font-style: normal; opacity: 0.8; }
.sky-field input { font: inherit; font-size: 1rem; padding: 0.7rem 0.85rem; border: 1px solid var(--glass-border-ink); border-radius: 4px; background: var(--color-paper); color: var(--color-ink); }
.sky-field input:focus { outline: 2px solid var(--color-clay); outline-offset: 1px; }
.sky-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.sky-field-note, .sky-form-note { color: var(--color-muted); font-size: 0.78rem; }
.sky-place-results { position: absolute; z-index: 5; top: 100%; left: 0; right: 0; margin: 0.25rem 0 0; padding: 0.25rem; list-style: none; background: var(--color-paper); border: 1px solid var(--glass-border-ink); border-radius: 4px; box-shadow: 0 12px 32px rgba(55, 48, 39, 0.14); max-height: 16rem; overflow: auto; }
.sky-place-results button { width: 100%; display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 0.7rem; border: 0; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; border-radius: 3px; }
.sky-place-results button:hover, .sky-place-results button:focus-visible { background: var(--color-soft); outline: none; }
.sky-place-results small { color: var(--color-muted); }
.sky-form-error { margin: 0; color: #8a3b2e; font-size: 0.85rem; }
.sky-cart-attributes { margin: 0.25rem 0 0; color: var(--color-muted); font-size: 0.8rem; line-height: 1.4; }
@media (max-width: 767px) {
  .sky-field-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: Checks** — `npm run typecheck` and `node --test scripts/csp.node-test.mjs` (self-hosted fonts use `'self'`, covered by Hydrogen's default-src; if the test or browser console shows a `font-src` violation, add `fontSrc: ["'self'"]` in `entry.server.tsx`).

- [ ] **Step 5: Commit** — `git add app/lib/sky/svg.tsx app/components/SkyConfigurator.tsx app/styles/app.css && git commit -m "Add live star-map preview and configurator"`

---

### Task 10: Release gate, nav, sitemap

**Files:**
- Modify: `app/lib/catalogFilters.ts`, `app/components/ClaraShell.tsx`, `app/lib/sitemap.ts`, `scripts/catalogFilters.node-test.mjs`, `scripts/sitemap.node-test.mjs`

- [ ] **Step 1: Failing tests** — append to `scripts/catalogFilters.node-test.mjs`:

```js
import {computeSellableHandles as computeWithPersonalised, PERSONALISED_RELEASE_FLAGS, SKY_PRODUCT_HANDLE, hasReleasedPersonalised, isStagedPersonalisedHandle, isUnreleasedExtensionHandle as isUnreleasedStaged} from '../app/lib/catalogFilters.ts';

test('personalised flag gates the star map like an extension', () => {
  assert.equal(SKY_PRODUCT_HANDLE, 'your-sky-star-map');
  assert.equal(PERSONALISED_RELEASE_FLAGS[SKY_PRODUCT_HANDLE], false);
  assert.equal(isStagedPersonalisedHandle(SKY_PRODUCT_HANDLE), true);
  assert.equal(isUnreleasedStaged(SKY_PRODUCT_HANDLE), true);
  assert.equal(computeWithPersonalised(EXTENSION_RELEASE_FLAGS, {[SKY_PRODUCT_HANDLE]: false}).has(SKY_PRODUCT_HANDLE), false);
  assert.equal(computeWithPersonalised(EXTENSION_RELEASE_FLAGS, {[SKY_PRODUCT_HANDLE]: true}).has(SKY_PRODUCT_HANDLE), true);
  assert.equal(hasReleasedPersonalised({[SKY_PRODUCT_HANDLE]: true}), true);
});
```

(Use whichever import style the file already uses — it imports `test` from `node:test` or uses top-level asserts; match it.)

- [ ] **Step 2: Implement** in `app/lib/catalogFilters.ts` (after `EXTENSION_RELEASE_FLAGS`):

```ts
export const SKY_PRODUCT_HANDLE = 'your-sky-star-map';

/**
 * Personalised products staged for release. Same dual gate as extensions:
 * flag AND Shopify publication. Flip via docs/your-sky-release.md.
 */
export const PERSONALISED_RELEASE_FLAGS: Record<string, boolean> = {
  [SKY_PRODUCT_HANDLE]: false,
};

export function isStagedPersonalisedHandle(handle?: string | null) {
  return Boolean(handle && handle.toLowerCase() in PERSONALISED_RELEASE_FLAGS);
}

export function hasReleasedPersonalised(flags: Record<string, boolean> = PERSONALISED_RELEASE_FLAGS) {
  return Object.values(flags).some(Boolean);
}
```

Change `computeSellableHandles` to accept a second argument and include released personalised handles:

```ts
export function computeSellableHandles(
  extensionFlags: Record<string, boolean> = EXTENSION_RELEASE_FLAGS,
  personalisedFlags: Record<string, boolean> = PERSONALISED_RELEASE_FLAGS,
): ReadonlySet<string> {
  const handles = new Set(LAUNCH_PRODUCT_HANDLES);
  for (const flags of [extensionFlags, personalisedFlags]) {
    for (const [handle, released] of Object.entries(flags)) {
      if (released) handles.add(handle.toLowerCase());
    }
  }
  return handles;
}
```

Extend `isUnreleasedExtensionHandle` so the sitemap strips staged personalised handles too:

```ts
export function isUnreleasedExtensionHandle(handle?: string | null) {
  const key = handle?.toLowerCase();
  if (!key) return false;
  if (key in EXTENSION_RELEASE_FLAGS) return !EXTENSION_RELEASE_FLAGS[key];
  if (key in PERSONALISED_RELEASE_FLAGS) return !PERSONALISED_RELEASE_FLAGS[key];
  return false;
}
```

`app/components/ClaraShell.tsx` — add after the Everyday entry:

```ts
  ...(hasReleasedPersonalised()
    ? [{to: `/products/${SKY_PRODUCT_HANDLE}`, label: 'Your Sky'}]
    : []),
```

and import `hasReleasedPersonalised, SKY_PRODUCT_HANDLE` from `~/lib/catalogFilters`.

`scripts/sitemap.node-test.mjs` — add a case asserting `<url><loc>https://shopclaramendes.com/products/your-sky-star-map</loc></url>` is removed by `removeExcludedSitemapEntries` while the flag is false.

- [ ] **Step 3: Run** `npm test` → PASS. **Step 4: Commit** — `git add app/lib/catalogFilters.ts app/components/ClaraShell.tsx scripts/catalogFilters.node-test.mjs scripts/sitemap.node-test.mjs && git commit -m "Stage the star map behind a personalised release flag"`

---

### Task 11: PDP integration

**Files:**
- Modify: `app/routes/products.$handle.tsx`, `env.d.ts`

- [ ] **Step 1: Env typing** — in `env.d.ts` `interface Env` add:

```ts
    /** 'true' only in the Oxygen preview environment: lets a staged personalised PDP render for the end-to-end test. */
    SKY_PREVIEW_UNLOCK?: string;
    SKY_SIGNING_SECRET?: string;
    SHOPIFY_WEBHOOK_SECRET?: string;
    PRODIGI_API_KEY?: string;
    PRODIGI_API_BASE?: string;
```

- [ ] **Step 2: Loader** — in `loader`, replace the demo redirect:

```ts
  const previewUnlocked =
    isStagedPersonalisedHandle(handle) && context.env.SKY_PREVIEW_UNLOCK === 'true';
  if (isDemoProduct(data.product) && !previewUnlocked) {
    throw redirect('/collections/all');
  }
```

and return `skyTheme: DEFAULT_SKY_THEME` from the loader. Imports: `isStagedPersonalisedHandle` from `~/lib/catalogFilters`, `DEFAULT_SKY_THEME` from `~/lib/sky/themes`, `SKY_PRODUCT_TYPE, skySizeFromOptions` from `~/lib/sky/products`, `toCartAttributes, type SkyParams` from `~/lib/sky/params`, `SkyConfigurator` from `~/components/SkyConfigurator`.

- [ ] **Step 3: Component** — inside `Product()`:

```ts
  const isSkyMap = (product.productType || '').toLowerCase() === SKY_PRODUCT_TYPE.toLowerCase();
  const [skyParams, setSkyParams] = useState<SkyParams | null>(null);
  const skySize = skySizeFromOptions(selectedVariant?.selectedOptions);
  const skyAttributes = isSkyMap && skyParams ? toCartAttributes(skyParams) : undefined;
  const purchaseBlocked = !selectedVariant?.availableForSale || (isSkyMap && !skyParams);
```

Replace both `AddToCartButton` usages' `disabled` with `purchaseBlocked` and their `lines` with:

```ts
                  selectedVariant
                    ? [{merchandiseId: selectedVariant.id, quantity, selectedVariant, ...(skyAttributes ? {attributes: skyAttributes} : {})}]
                    : []
```

Hide the Shop Pay accelerator when `isSkyMap` (it cannot carry line attributes). Replace the gallery:

```tsx
        {isSkyMap ? (
          <SkyConfigurator size={skySize} theme={skyTheme} onChange={setSkyParams} />
        ) : (
          <ProductGalleryCarousel … unchanged … />
        )}
```

Add detail rows inside `<dl className="product-details-list">` when `isSkyMap`:

```tsx
            {isSkyMap ? (
              <>
                <div><dt>Print</dt><dd>Giclée print in archival pigment inks on 200gsm Enhanced Matte Art paper, printed to order at {SKY_SIZES[skySize].label}. Framed editions come in a solid wood classic frame with clear acrylic glazing, ready to hang.</dd></div>
                <div><dt>Accuracy</dt><dd>Every star brighter than the naked-eye limit, the Moon at its true phase and place, and the visible planets — calculated for your exact place and moment. Star data: Yale Bright Star Catalogue; places: GeoNames (CC BY 4.0).</dd></div>
                <div><dt>Personalisation</dt><dd>Your title, the place, the date and its coordinates are set in the lower band. We print exactly what the preview shows, so check spelling before you add to cart.</dd></div>
              </>
            ) : null}
```

When `isSkyMap`, the purchase-panel button label while blocked reads `Add your place and date` instead of `Sold out`:

```ts
  const purchaseButtonLabel = isSkyMap && !skyParams ? 'Add your place and date' : selectedVariant?.availableForSale && selectedVariantPrice ? `Add to cart - ${selectedVariantPrice}` : 'Sold out';
```

- [ ] **Step 4: Verify** — `npm run typecheck && npm run lint`. Start the dev server (`preview_start` with the `clara-remediation` launch entry) and open `/products/your-sky-star-map` — until the product exists in Shopify this 404s, so verify the non-sky PDPs still render (`/products/quiet-form-i-art-print`) with no console errors.

- [ ] **Step 5: Commit** — `git add app/routes/products.\$handle.tsx env.d.ts && git commit -m "Render the star-map configurator on its product page"`

---

### Task 12: Cart signing + cart line display

**Files:**
- Create: `app/lib/sky/cartLines.server.ts`
- Modify: `app/routes/cart.tsx`, `app/components/CartLineItem.tsx`
- Test: `scripts/skyCartLines.node-test.mjs`

- [ ] **Step 1: Failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {signSkyCartLines} from '../app/lib/sky/cartLines.server.ts';
import {toCartAttributes, validateSkyParams} from '../app/lib/sky/params.ts';
import {verifyCanonical} from '../app/lib/sky/sign.server.ts';
import {canonicalSkyParams} from '../app/lib/sky/params.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const params = validateSkyParams({date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', place: 'Paris, France', title: 'Hi', theme: 'linen'}).params;

test('signs sky lines, leaves other lines alone', async () => {
  const lines = [
    {merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1},
    {merchandiseId: 'gid://shopify/ProductVariant/2', quantity: 2, attributes: toCartAttributes(params)},
  ];
  const result = await signSkyCartLines(lines, SECRET);
  assert.equal(result.ok, true);
  assert.equal(result.lines[0].attributes, undefined);
  const sig = result.lines[1].attributes.find((a) => a.key === '_sig').value;
  assert.equal(await verifyCanonical(canonicalSkyParams(params), sig, SECRET), true);
  assert.equal(result.lines[1].attributes.find((a) => a.key === 'Place').value, 'Paris, France');
});

test('rejects invalid sky lines and missing secret', async () => {
  const bad = [{merchandiseId: 'x', quantity: 1, attributes: [{key: '_v', value: '1'}, {key: '_date', value: '1850-01-01'}]}];
  assert.equal((await signSkyCartLines(bad, SECRET)).ok, false);
  const good = [{merchandiseId: 'x', quantity: 1, attributes: toCartAttributes(params)}];
  const noSecret = await signSkyCartLines(good, undefined);
  assert.equal(noSecret.ok, false);
  assert.match(noSecret.error, /not available/i);
});
```

- [ ] **Step 2: Implement** `app/lib/sky/cartLines.server.ts`:

```ts
import {fromCartAttributes, isSkyCartLine, toCartAttributes} from './params.ts';
import {signSkyParams} from './sign.server.ts';

type LineLike = {attributes?: Array<{key: string; value?: string | null}> | null; [key: string]: unknown};

export async function signSkyCartLines<T extends LineLike>(lines: T[], secret: string | undefined): Promise<{ok: true; lines: T[]} | {ok: false; error: string}> {
  const out: T[] = [];
  for (const line of lines) {
    if (!isSkyCartLine(line.attributes)) { out.push(line); continue; }
    if (!secret) return {ok: false, error: 'Personalisation is not available right now. Please try again later.'};
    const decoded = fromCartAttributes(line.attributes);
    if (!decoded.ok) return {ok: false, error: decoded.error};
    const sig = await signSkyParams(decoded.params, secret);
    out.push({...line, attributes: toCartAttributes(decoded.params, sig)});
  }
  return {ok: true, lines: out};
}
```

`app/routes/cart.tsx` — in `LinesAdd`:

```ts
    case CartForm.ACTIONS.LinesAdd: {
      const signed = await signSkyCartLines(inputs.lines, context.env.SKY_SIGNING_SECRET);
      if (!signed.ok) {
        return data({errors: [{message: signed.error}]}, {status: 400});
      }
      result = await cart.addLines(signed.lines);
      result = await updateCartAttribution({cart, formData, result});
      break;
    }
```

Import `signSkyCartLines` from `~/lib/sky/cartLines.server` and `data` is already imported.

`app/components/CartLineItem.tsx` — under the product title render:

```tsx
          {line.attributes?.some((a) => !a.key.startsWith('_')) ? (
            <p className="sky-cart-attributes">
              {line.attributes.filter((a) => !a.key.startsWith('_') && a.value).map((a) => a.value).join(' · ')}
            </p>
          ) : null}
```

(Find the element that renders `product.title` / `title` and place it directly after.)

- [ ] **Step 3: Run** tests + typecheck → PASS. **Step 4: Commit** — `git add app/lib/sky/cartLines.server.ts app/routes/cart.tsx app/components/CartLineItem.tsx scripts/skyCartLines.node-test.mjs && git commit -m "Sign star-map cart lines server-side and show them in the cart"`

---

### Task 13: Prodigi client, order builder, webhook

**Files:**
- Create: `app/lib/prodigi.server.ts`, `app/lib/shopifyWebhook.server.ts`, `app/lib/sky/fulfilment.ts`, `app/routes/webhooks.orders-paid.tsx`
- Test: `scripts/skyFulfilment.node-test.mjs`, `scripts/shopifyWebhook.node-test.mjs`

- [ ] **Step 1: Failing tests**

`scripts/shopifyWebhook.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHmac} from 'node:crypto';
import {verifyShopifyWebhook} from '../app/lib/shopifyWebhook.server.ts';

test('accepts a correctly signed body and rejects everything else', async () => {
  const secret = 'shpss_test';
  const body = '{"id":1}';
  const good = createHmac('sha256', secret).update(body).digest('base64');
  assert.equal(await verifyShopifyWebhook(body, good, secret), true);
  assert.equal(await verifyShopifyWebhook(body + ' ', good, secret), false);
  assert.equal(await verifyShopifyWebhook(body, 'AAAA', secret), false);
  assert.equal(await verifyShopifyWebhook(body, null, secret), false);
});
```

`scripts/skyFulfilment.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {toCartAttributes, validateSkyParams} from '../app/lib/sky/params.ts';
import {signSkyParams} from '../app/lib/sky/sign.server.ts';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const params = validateSkyParams({date: '2019-06-14', time: '22:00', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', place: 'Paris, France', title: 'Hi', theme: 'linen'}).params;

async function order(overrides = {}) {
  const sig = await signSkyParams(params, SECRET);
  const props = toCartAttributes(params, sig).map(({key, value}) => ({name: key, value}));
  return {
    id: 5001, name: '#1042', email: 'anna@example.com', phone: null,
    shipping_address: {name: 'Anna Beispiel', address1: 'Musterstraße 1', address2: '', city: 'Berlin', province: null, zip: '10115', country_code: 'DE', phone: '+49 30 1234567'},
    line_items: [
      {id: 1, sku: 'CM-PRINT-8X10', quantity: 1, properties: []},
      {id: 2, sku: 'CM-SKY-20X24-BLK', quantity: 2, properties: props},
    ],
    ...overrides,
  };
}

test('builds a Prodigi order for signed sky lines only', async () => {
  const result = await buildProdigiOrderFromShopify(await order(), {secret: SECRET, origin: 'https://shopclaramendes.com'});
  assert.equal(result.kind, 'order');
  const p = result.payload;
  assert.equal(p.idempotencyKey, 'shopify:5001');
  assert.equal(p.merchantReference, '#1042');
  assert.equal(p.shippingMethod, 'Standard');
  assert.deepEqual(p.recipient.address, {line1: 'Musterstraße 1', line2: '', townOrCity: 'Berlin', stateOrCounty: null, postalOrZipCode: '10115', countryCode: 'DE'});
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].sku, 'GLOBAL-CFP-20X24');
  assert.deepEqual(p.items[0].attributes, {color: 'black'});
  assert.equal(p.items[0].copies, 2);
  assert.match(p.items[0].assets[0].url, /^https:\/\/shopclaramendes\.com\/api\/sky-print\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.pdf$/);
});

test('skips orders without sky lines and flags bad signatures', async () => {
  const none = await buildProdigiOrderFromShopify(await order({line_items: [{id: 1, sku: 'CM-PRINT-8X10', quantity: 1, properties: []}]}), {secret: SECRET, origin: 'https://x'});
  assert.equal(none.kind, 'skip');
  const o = await order();
  o.line_items[1].properties = o.line_items[1].properties.map((p) => (p.name === '_sig' ? {...p, value: 'tampered'} : p));
  const bad = await buildProdigiOrderFromShopify(o, {secret: SECRET, origin: 'https://x'});
  assert.equal(bad.kind, 'problem');
  assert.match(bad.reason, /signature/i);
});
```

- [ ] **Step 2: Implement**

`app/lib/shopifyWebhook.server.ts`:

```ts
const encoder = new TextEncoder();

export async function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null, secret: string) {
  if (!hmacHeader) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody)));
  let binary = '';
  for (const b of digest) binary += String.fromCharCode(b);
  const expected = btoa(binary);
  if (expected.length !== hmacHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  return diff === 0;
}
```

`app/lib/prodigi.server.ts`:

```ts
export class ProdigiNotConfiguredError extends Error {}
export class ProdigiRequestError extends Error {
  constructor(message: string, public status: number, public body: unknown) { super(message); }
}

export type ProdigiOrderPayload = {
  idempotencyKey: string;
  merchantReference: string;
  shippingMethod: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight';
  recipient: {name: string; email?: string; phoneNumber?: string; address: {line1: string; line2?: string; townOrCity: string; stateOrCounty?: string | null; postalOrZipCode: string; countryCode: string}};
  items: Array<{merchantReference: string; sku: string; copies: number; sizing: 'fillPrintArea'; attributes: Record<string, string>; assets: Array<{printArea: 'default'; url: string}>}>;
};

export type ProdigiOrderResponse = {outcome: 'Created' | 'CreatedWithIssues' | 'AlreadyExists' | 'OnHold' | string; order?: {id: string; status?: {stage: string; issues?: unknown[]}}};

export function createProdigiClient(env: {PRODIGI_API_KEY?: string; PRODIGI_API_BASE?: string}) {
  const apiKey = env.PRODIGI_API_KEY;
  const base = (env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com').replace(/\/$/, '');
  if (!apiKey) throw new ProdigiNotConfiguredError('PRODIGI_API_KEY is not set.');

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}/v4.0${path}`, {
      method, headers: {'X-API-Key': apiKey!, 'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as T;
    if (!res.ok) throw new ProdigiRequestError(`Prodigi ${method} ${path} → ${res.status}`, res.status, json);
    return json;
  }

  return {
    base,
    createOrder: (payload: ProdigiOrderPayload) => request<ProdigiOrderResponse>('POST', '/orders', payload),
    getOrder: (id: string) => request<{order: unknown}>('GET', `/orders/${id}`),
    getProduct: (sku: string) => request<{product: unknown}>('GET', `/products/${encodeURIComponent(sku)}`),
    quote: (payload: unknown) => request<unknown>('POST', '/quotes', payload),
  };
}
```

`app/lib/sky/fulfilment.ts`:

```ts
import type {ProdigiOrderPayload} from '../prodigi.server.ts';
import {canonicalSkyParams, fromCartAttributes} from './params.ts';
import {skyVariantForSku} from './products.ts';
import {encodeSkyToken, verifyCanonical} from './sign.server.ts';

/** Subset of Shopify's orders/paid webhook payload that we read. */
export type ShopifyOrderWebhook = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  shipping_address?: {name?: string | null; first_name?: string | null; last_name?: string | null; address1?: string | null; address2?: string | null; city?: string | null; province?: string | null; zip?: string | null; country_code?: string | null; phone?: string | null} | null;
  line_items: Array<{id: number; sku?: string | null; quantity: number; properties?: Array<{name: string; value: string | null}> | null}>;
};

export type FulfilmentBuild =
  | {kind: 'skip'; reason: string}
  | {kind: 'problem'; reason: string}
  | {kind: 'order'; payload: ProdigiOrderPayload};

export async function buildProdigiOrderFromShopify(order: ShopifyOrderWebhook, {secret, origin}: {secret: string; origin: string}): Promise<FulfilmentBuild> {
  const skyLines = order.line_items.filter((l) => l.properties?.some((p) => p.name === '_v'));
  if (skyLines.length === 0) return {kind: 'skip', reason: 'No personalised lines.'};

  const items: ProdigiOrderPayload['items'] = [];
  for (const line of skyLines) {
    const decoded = fromCartAttributes((line.properties ?? []).map((p) => ({key: p.name, value: p.value})));
    if (!decoded.ok) return {kind: 'problem', reason: `Line ${line.id}: ${decoded.error}`};
    if (!decoded.sig || !(await verifyCanonical(canonicalSkyParams(decoded.params), decoded.sig, secret))) {
      return {kind: 'problem', reason: `Line ${line.id}: bad signature.`};
    }
    const variant = skyVariantForSku(line.sku);
    if (!variant) return {kind: 'problem', reason: `Line ${line.id}: unknown SKU ${line.sku ?? '(none)'}.`};
    const token = await encodeSkyToken(decoded.params, secret);
    items.push({
      merchantReference: `line:${line.id}`, sku: variant.prodigiSku, copies: line.quantity, sizing: 'fillPrintArea',
      attributes: variant.attributes, assets: [{printArea: 'default', url: `${origin}/api/sky-print/${token}.pdf`}],
    });
  }

  const a = order.shipping_address;
  if (!a?.address1 || !a.city || !a.zip || !a.country_code) return {kind: 'problem', reason: 'Missing shipping address.'};
  const name = a.name || [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Customer';
  return {
    kind: 'order',
    payload: {
      idempotencyKey: `shopify:${order.id}`, merchantReference: order.name, shippingMethod: 'Standard',
      recipient: {name, email: order.email ?? undefined, phoneNumber: a.phone ?? order.phone ?? undefined,
        address: {line1: a.address1, line2: a.address2 ?? '', townOrCity: a.city, stateOrCounty: a.province ?? null, postalOrZipCode: a.zip, countryCode: a.country_code}},
      items,
    },
  };
}
```

`app/routes/webhooks.orders-paid.tsx`:

```tsx
import type {Route} from './+types/webhooks.orders-paid';
import {createProdigiClient, ProdigiNotConfiguredError} from '~/lib/prodigi.server';
import {verifyShopifyWebhook} from '~/lib/shopifyWebhook.server';
import {buildProdigiOrderFromShopify, type ShopifyOrderWebhook} from '~/lib/sky/fulfilment';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

export async function loader() {
  return new Response('Method Not Allowed', {status: 405});
}

/**
 * Shopify `orders/paid` → Prodigi order for every signed star-map line.
 * 2xx tells Shopify we are done; 5xx makes it retry (8× over 4 h), which is
 * safe because the Prodigi idempotency key is derived from the order id.
 */
export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', {status: 405});
  const {env} = context;
  const rawBody = await request.text();
  const secret = env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !(await verifyShopifyWebhook(rawBody, request.headers.get('X-Shopify-Hmac-Sha256'), secret))) {
    return new Response('Unauthorized', {status: 401});
  }
  if (request.headers.get('X-Shopify-Topic') !== 'orders/paid') return new Response('Ignored topic', {status: 200});

  let order: ShopifyOrderWebhook;
  try {
    order = JSON.parse(rawBody) as ShopifyOrderWebhook;
  } catch {
    return new Response('Bad JSON', {status: 400});
  }

  const signingSecret = env.SKY_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('orders/paid: SKY_SIGNING_SECRET missing');
    return new Response('Not configured', {status: 500});
  }
  const build = await buildProdigiOrderFromShopify(order, {secret: signingSecret, origin: STOREFRONT_ORIGIN});
  if (build.kind === 'skip') return new Response('No personalised lines', {status: 200});
  if (build.kind === 'problem') {
    // Retrying cannot fix a bad signature or an unmapped SKU; log for replay.
    console.error(`orders/paid: order ${order.id} (${order.name}) needs attention: ${build.reason}`);
    return new Response('Needs attention', {status: 200});
  }

  try {
    const prodigi = createProdigiClient(env);
    const response = await prodigi.createOrder(build.payload);
    console.log(`orders/paid: ${order.name} → Prodigi ${response.outcome} ${response.order?.id ?? ''}`);
    return new Response(response.outcome, {status: 200});
  } catch (error) {
    if (error instanceof ProdigiNotConfiguredError) {
      console.error('orders/paid: Prodigi not configured');
      return new Response('Not configured', {status: 500});
    }
    console.error(`orders/paid: Prodigi call failed for ${order.name}`, error);
    return new Response('Prodigi error', {status: 502});
  }
}
```

- [ ] **Step 3: Run** tests + typecheck → PASS. **Step 4: Commit** — `git add app/lib/prodigi.server.ts app/lib/shopifyWebhook.server.ts app/lib/sky/fulfilment.ts app/routes/webhooks.orders-paid.tsx scripts/skyFulfilment.node-test.mjs scripts/shopifyWebhook.node-test.mjs && git commit -m "Create Prodigi orders from paid star-map orders"`

---

### Task 14: Print route

**Files:**
- Create: `app/routes/api.sky-print.$token[.pdf].tsx`

- [ ] **Step 1: Implement**

```tsx
import type {Route} from './+types/api.sky-print.$token[.pdf]';
import {loadSkyCatalog} from '~/lib/sky/catalog';
import {renderSkyPdf, type SkyFonts} from '~/lib/sky/pdf.server';
import {computeSky} from '~/lib/sky/scene';
import {decodeSkyToken} from '~/lib/sky/sign.server';
import {PLATE_PATH, SKY_THEMES} from '~/lib/sky/themes';
import type {SkySizeKey} from '~/lib/sky/products';

let fontsPromise: Promise<SkyFonts> | null = null;
const plateCache = new Map<string, Promise<Uint8Array | null>>();

async function fetchBytes(url: URL) {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${url.pathname} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function loadFonts(base: URL) {
  fontsPromise ??= Promise.all([
    fetchBytes(new URL('/fonts/EBGaramond-Regular.ttf', base)),
    fetchBytes(new URL('/fonts/EBGaramond-Italic.ttf', base)),
  ]).then(([regular, italic]) => ({regular, italic})).catch((e) => { fontsPromise = null; throw e; });
  return fontsPromise;
}

function loadPlate(base: URL, path: string) {
  let p = plateCache.get(path);
  if (!p) {
    p = fetchBytes(new URL(path, base)).catch((e) => { console.error('sky-print: plate unavailable, using flat background', e); return null; });
    plateCache.set(path, p);
  }
  return p;
}

/** `?size=20x24` selects the sheet; Prodigi asset URLs carry it per item. Default 8x10. */
export async function loader({params, request, context}: Route.LoaderArgs) {
  const secret = context.env.SKY_SIGNING_SECRET;
  if (!secret) return new Response('Not configured', {status: 500});
  const decoded = await decodeSkyToken(params.token, secret);
  if (!decoded.ok) return new Response('Not found', {status: 404});
  const url = new URL(request.url);
  const size: SkySizeKey = url.searchParams.get('size') === '20x24' ? '20x24' : '8x10';
  const theme = SKY_THEMES[decoded.params.theme];
  const [catalog, fonts, plate] = await Promise.all([loadSkyCatalog(), loadFonts(url), loadPlate(url, PLATE_PATH(theme.id, 'print'))]);
  const scene = computeSky({params: decoded.params, size, catalog});
  const pdf = await renderSkyPdf({scene, theme, fonts, plate, createdAt: new Date(`${decoded.params.date}T00:00:00Z`)});
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="your-sky-${size}.pdf"`,
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
```

Because the asset URL must carry the size, update `fulfilment.ts` to append `?size=${variant.size}` to the asset URL, and the fulfilment test regex to `/\.pdf\?size=20x24$/`.

- [ ] **Step 2: Verify locally** — with `SKY_SIGNING_SECRET=dev-secret-…` in `.env`, run the dev server, generate a token with `node -e` using `encodeSkyToken`, open `http://localhost:3000/api/sky-print/<token>.pdf?size=20x24`, confirm a PDF downloads and renders (Read tool). Also confirm the route file name resolves to `/api/sky-print/:token.pdf` (check `react-router routes` output or just request it).

- [ ] **Step 3: Commit** — `git add "app/routes/api.sky-print.\$token[.pdf].tsx" app/lib/sky/fulfilment.ts scripts/skyFulfilment.node-test.mjs && git commit -m "Serve signed star-map print files as PDF"`

---

### Task 15: Operator scripts

**Files:**
- Create: `scripts/sky-register-webhook.mjs`, `scripts/sky-replay-order.mjs`

- [ ] **Step 1: Webhook registration** `scripts/sky-register-webhook.mjs`:

```js
#!/usr/bin/env node
// Registers (or lists) the orders/paid webhook for the star-map fulfilment.
// Usage: node scripts/sky-register-webhook.mjs [--list] [--url https://shopclaramendes.com/webhooks/orders-paid]
import {parseArgs} from 'node:util';
import {envWithAdminDefaults, getRequiredEnv, normalizeShopDomain} from './lib/env.mjs';

const {values: a} = parseArgs({options: {list: {type: 'boolean', default: false}, url: {type: 'string', default: 'https://shopclaramendes.com/webhooks/orders-paid'}}});
const env = envWithAdminDefaults();
const shop = normalizeShopDomain(getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'));
const token = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');

async function gql(query, variables) {
  const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token}, body: JSON.stringify({query, variables})});
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const existing = await gql(`{ webhookSubscriptions(first: 50, topics: [ORDERS_PAID]) { nodes { id endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } } } }`);
console.table(existing.webhookSubscriptions.nodes.map((n) => ({id: n.id, url: n.endpoint.callbackUrl})));
if (a.list) process.exit(0);
if (existing.webhookSubscriptions.nodes.some((n) => n.endpoint.callbackUrl === a.url)) { console.log('Already registered.'); process.exit(0); }
const created = await gql(`mutation($url: URL!) { webhookSubscriptionCreate(topic: ORDERS_PAID, webhookSubscription: {callbackUrl: $url, format: JSON}) { webhookSubscription { id } userErrors { field message } } }`, {url: a.url});
console.log(JSON.stringify(created, null, 2));
```

- [ ] **Step 2: Replay** `scripts/sky-replay-order.mjs`:

```js
#!/usr/bin/env node
// Re-runs star-map fulfilment for one Shopify order (by numeric id or name).
// Usage: node scripts/sky-replay-order.mjs --order 5001 [--dry-run]
// Needs .env.shopify-admin.local (Admin token) and .env.sky.local with
// SKY_SIGNING_SECRET, PRODIGI_API_KEY, PRODIGI_API_BASE.
import {parseArgs} from 'node:util';
import {envWithAdminDefaults, getRequiredEnv, loadLocalEnv, normalizeShopDomain} from './lib/env.mjs';
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {createProdigiClient} from '../app/lib/prodigi.server.ts';

const {values: a} = parseArgs({options: {order: {type: 'string'}, 'dry-run': {type: 'boolean', default: false}}});
const env = {...envWithAdminDefaults(), ...loadLocalEnv('.env.sky.local'), ...process.env};
const shop = normalizeShopDomain(getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'));
const token = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
if (!a.order) throw new Error('--order is required');

const query = a.order.startsWith('#') ? `name:${a.order}` : `id:${a.order}`;
const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token}, body: JSON.stringify({query: `query($q: String!) { orders(first: 1, query: $q) { nodes { legacyResourceId name email phone shippingAddress { name address1 address2 city province zip countryCodeV2 phone } lineItems(first: 50) { nodes { id sku quantity customAttributes { key value } } } } } }`, variables: {q: query}})});
const json = await res.json();
const node = json.data?.orders?.nodes?.[0];
if (!node) throw new Error(`Order ${a.order} not found: ${JSON.stringify(json.errors ?? json)}`);

const order = {
  id: Number(node.legacyResourceId), name: node.name, email: node.email, phone: node.phone,
  shipping_address: node.shippingAddress && {name: node.shippingAddress.name, address1: node.shippingAddress.address1, address2: node.shippingAddress.address2, city: node.shippingAddress.city, province: node.shippingAddress.province, zip: node.shippingAddress.zip, country_code: node.shippingAddress.countryCodeV2, phone: node.shippingAddress.phone},
  line_items: node.lineItems.nodes.map((l) => ({id: Number(l.id.split('/').pop()), sku: l.sku, quantity: l.quantity, properties: l.customAttributes.map((c) => ({name: c.key, value: c.value}))})),
};
const build = await buildProdigiOrderFromShopify(order, {secret: getRequiredEnv(env, 'SKY_SIGNING_SECRET'), origin: 'https://shopclaramendes.com'});
console.log(JSON.stringify(build, null, 2));
if (build.kind !== 'order' || a['dry-run']) process.exit(build.kind === 'order' ? 0 : 1);
const prodigi = createProdigiClient(env);
const response = await prodigi.createOrder(build.payload);
console.log(`${prodigi.base}: ${response.outcome} ${response.order?.id ?? ''}`);
```

- [ ] **Step 3: Smoke** — `node scripts/sky-register-webhook.mjs --list` fails cleanly with "Missing required environment variable" on this machine (no admin token locally) — that is the expected output here; the owner runs it with credentials. Commit — `git add scripts/sky-register-webhook.mjs scripts/sky-replay-order.mjs && git commit -m "Add star-map webhook registration and order replay scripts"`

---

### Task 16: Runbook, wiki note, CI green

**Files:**
- Create: `docs/your-sky-release.md`
- Modify: `docs/llm-wiki/...` (one line pointing at the runbook, following the existing index convention)

- [ ] **Step 1: Runbook** `docs/your-sky-release.md` covering, in order: (1) Oxygen env vars (names, which environment, how to generate `SKY_SIGNING_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`); (2) Shopify product creation checklist — title, handle, productType `Personalised Art`, vendor, tags, options Size (`8 × 10 in`, `20 × 24 in`) × Finish (`Unframed`, `Natural frame`, `Black frame`), the six SKUs and EUR prices from the spec, status Active, published to **no** channel until launch, toggled OFF in the Prodigi channel; (3) `sky-register-webhook.mjs`; (4) preview-environment test: set `SKY_PREVIEW_UNLOCK=true` on Preview, publish the product to the Headless channel, create discount `SKY-TEST-100`, place the order, check the sandbox dashboard, then unpublish; (5) go-live: flip `PERSONALISED_RELEASE_FLAGS`, switch Prodigi env to live, publish to both channels, remove `SKY_PREVIEW_UNLOCK`; (6) rollback: flag false + unpublish; (7) replay procedure; (8) landed-cost table (filled after the quotes call in Task 17).

- [ ] **Step 2: Full checks** — `npm test && npm run typecheck && npm run lint && npm run build`. Fix anything red.

- [ ] **Step 3: Commit and open the PR** — `git add docs && git commit -m "Document the star-map release runbook"`; push branch; `gh pr create --title "Your Sky: personalised star map line" --body-file <file>` (PS 5.1 mangles quotes — always use `--body-file`). CI must be green incl. the Oxygen preview deployment.

---

### Task 17: Visual sign-off, product setup, end-to-end proof, adversarial verify

- [ ] **Step 1: Three directions for the owner** — render `linen`, `midnight-garden`, `quiet-form` at 8×10 for the Paris example with `sky-render-local.mjs`, convert to PNG (Read tool renders PDFs directly) and send with `SendUserFile`; record the pick in the spec's §4 and set `DEFAULT_SKY_THEME`.

- [ ] **Step 2: Owner actions** (blocking, listed in the runbook): Prodigi sandbox + live keys, custom-app secret + `read_orders`, Oxygen env vars. Meanwhile confirm Prodigi attribute names with the sandbox key once available: `GET /v4.0/products/GLOBAL-CFP-8X10` must list `color` with `natural`/`black`; if the attribute is named differently, update `SKY_VARIANTS` and its test.

- [ ] **Step 3: Quotes** — `POST /v4.0/quotes` for each of the four Prodigi SKUs to DE/FR/NL with Standard shipping; fill the landed-cost table in the runbook; adjust prices in the spec if margin < 45 %.

- [ ] **Step 4: Create the Shopify product** through the admin UI in the owner's Chrome (claude-in-chrome), following the runbook checklist; toggle it OFF in the Prodigi channel; verify via the Storefront API that `productByHandle("your-sky-star-map")` returns 6 variants with the right SKUs once published to Headless.

- [ ] **Step 5: Preview-environment E2E** — with `SKY_PREVIEW_UNLOCK=true` on the Oxygen Preview environment: open the preview PDP (desktop + mobile via resize), fill Paris / date / title, screenshot the preview, add to cart, screenshot cart (attributes visible), checkout with `SKY-TEST-100`, complete the order, then verify: production webhook log shows `→ Prodigi Created`, sandbox dashboard shows the order with SKU/attributes/recipient and `downloadAssets` complete — screenshot. Open the asset URL from the sandbox order and Read the PDF.

- [ ] **Step 6: Screenshots in the user's Chrome** per the standing rule (not only the hidden pane); save under `screens/your-sky/`.

- [ ] **Step 7: `/adversarial-verify`** — invoke the skill against the deliverable (spec §1 done-criteria as acceptance). For each FAIL item: fix, re-run the relevant tests/screenshots, re-verify. Loop until PASS.

- [ ] **Step 8: Hand-off** — summarise evidence links, remaining owner steps for go-live (flag PR, env flip, publish), update memory note.

---

## Self-review

- Spec coverage: §2 offer → Tasks 4, 16, 17; §3 UX → Tasks 8, 9, 11, 12; §4 visual → Tasks 6, 7, 9, 17.1; §5 pipeline/modules/env/release gate → Tasks 10–15; §6 data/legal → Task 1 (NOTICE), 11 (credits row); §7 errors → Tasks 12–14 (messages, 401/500/502, plate fallback); §8 testing → every task + 17; §9 owner steps → 16, 17.
- Type consistency: `SkyParams`, `SkyScene`, `SkySizeKey`, `SkyThemeId`, `SkyFonts`, `ProdigiOrderPayload`, `ShopifyOrderWebhook`, `PlaceResult` are each defined once and referenced by the same names. `fromCartAttributes` returns `sig`; `fulfilment.ts` uses it. `encodeSkyToken` output is consumed by `api.sky-print.$token[.pdf].tsx` via `decodeSkyToken`.
- Known decision points flagged inline: matrix orientation (Task 5), `drawSvgPath` origin (Task 7), JSON import attribute (Task 8), `loadSkyCatalogSync` placement (Task 5), Prodigi attribute names (Task 17.2).
